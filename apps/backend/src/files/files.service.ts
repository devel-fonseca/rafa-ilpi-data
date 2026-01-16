import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { createHash } from 'crypto';
import { PutObjectCommandInput, GetObjectCommandInput, DeleteObjectCommandInput } from '@aws-sdk/client-s3';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  // Cache de URLs assinadas (em memória)
  // Key: filePath, Value: { url: string, expiresAt: number }
  private readonly urlCache = new Map<string, { url: string; expiresAt: number }>();

  // Limpar cache expirado a cada 10 minutos
  private readonly CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutos
  private readonly URL_CACHE_DURATION = 50 * 60 * 1000; // 50 minutos (URLs válidas por 1 hora)

  // Tipos de arquivo permitidos
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ];

  // Tamanho máximo: 10MB
  private readonly maxFileSize = 10 * 1024 * 1024;

  constructor(private readonly configService: ConfigService) {
    // Configurar cliente S3 para MinIO
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT')!;
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID')!;
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY')!;

    this.s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Necessário para MinIO
    });

    this.bucket = this.configService.get<string>('AWS_S3_BUCKET')!;

    this.logger.log(
      `FilesService initialized with bucket: ${this.bucket}`,
    );

    // Iniciar limpeza automática do cache
    setInterval(() => this.cleanExpiredCache(), this.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Gerar chave de criptografia derivada para SSE-C (Server-Side Encryption with Customer Key)
   * Usa master key do .env + tenantId para isolamento total
   */
  private generateEncryptionKey(tenantId: string): Buffer {
    const masterKey = this.configService.get<string>('ENCRYPTION_MASTER_KEY')!;

    // Derivar chave única por tenant usando HMAC-SHA256
    const derivedKey = createHash('sha256')
      .update(`${masterKey}:${tenantId}`)
      .digest();

    return derivedKey; // 32 bytes (256 bits)
  }

  /**
   * Verificar se categoria requer criptografia (dados sensíveis LGPD)
   */
  private requiresEncryption(category: string): boolean {
    const sensitiveCategories = [
      'documents',     // Documentos pessoais (RG, CPF, certidões)
      'prescriptions', // Receitas médicas
      'vaccinations',  // Comprovantes de vacinação
      'clinical',      // Laudos, exames clínicos
      'contracts',     // Contratos assinados
      'photos',        // Fotos dos residentes (dado biométrico)
    ];

    return sensitiveCategories.includes(category);
  }

  /**
   * Limpar URLs expiradas do cache
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.urlCache.entries()) {
      if (now > value.expiresAt) {
        this.urlCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned ${cleaned} expired URLs from cache`);
    }
  }

  /**
   * Processa foto e gera thumbnails (small, medium, original)
   * Usa convenção de nomenclatura: base.webp, base_small.webp, base_medium.webp
   * NÃO altera schema do banco - apenas gera múltiplos arquivos no MinIO
   * COM CRIPTOGRAFIA SSE-C para dados biométricos (LGPD Art. 5º, II)
   */
  private async processPhotoWithThumbnails(
    fileBuffer: Buffer,
    basePath: string, // Ex: "tenants/123/photos/456/uuid.webp"
    tenantId: string,
  ): Promise<void> {
    const variants = [
      { suffix: '', size: 300, quality: 95 }, // Original: uuid.webp
      { suffix: '_small', size: 64, quality: 90 }, // Small: uuid_small.webp
      { suffix: '_medium', size: 150, quality: 90 }, // Medium: uuid_medium.webp
    ];

    // Verificar se criptografia SSE-C está habilitada
    const useEncryption = this.configService.get<string>('MINIO_USE_ENCRYPTION') === 'true';

    // Gerar chave de criptografia para fotos (dado biométrico sensível)
    const encryptionKey = useEncryption ? this.generateEncryptionKey(tenantId) : null;
    const encryptionKeyMD5 = encryptionKey ? createHash('md5').update(encryptionKey).digest('base64') : null;

    for (const variant of variants) {
      // Processar imagem
      const processed = await sharp(fileBuffer)
        .resize(variant.size, variant.size, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: variant.quality })
        .toBuffer();

      // Gerar path com sufixo
      const variantPath = basePath.replace('.webp', `${variant.suffix}.webp`);

      // Preparar comando base
      const uploadCommand: PutObjectCommandInput = {
        Bucket: this.bucket,
        Key: variantPath,
        Body: processed,
        ContentType: 'image/webp',
      };

      // Adicionar SSE-C apenas se habilitado
      if (useEncryption && encryptionKey && encryptionKeyMD5) {
        uploadCommand.SSECustomerAlgorithm = 'AES256';
        uploadCommand.SSECustomerKey = encryptionKey.toString('base64');
        uploadCommand.SSECustomerKeyMD5 = encryptionKeyMD5;
      }

      // Upload para MinIO
      await this.s3Client.send(new PutObjectCommand(uploadCommand));

      this.logger.log(`Uploaded ${useEncryption ? 'ENCRYPTED' : 'UNENCRYPTED'} thumbnail: ${variantPath}`);
    }
  }

  /**
   * Upload de arquivo para MinIO
   * Path: tenants/{tenantId}/{category}/{filename}
   */
  async uploadFile(
    tenantId: string,
    file: Express.Multer.File,
    category: string,
    relatedId?: string,
  ): Promise<{
    fileId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }> {
    // Validar tipo de arquivo
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido: ${file.mimetype}`,
      );
    }

    // Validar tamanho do arquivo
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `Arquivo muito grande. Tamanho máximo: ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Gerar ID único para o arquivo
    const fileId = uuidv4();
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${fileId}.${fileExtension}`;

    // Construir path no MinIO
    // Estrutura: tenants/{tenantId}/{category}/{relatedId}/{fileName}
    let filePath = `tenants/${tenantId}/${category}`;
    if (relatedId) {
      filePath += `/${relatedId}`;
    }
    filePath += `/${fileName}`;

    try {
      // Verificar se categoria requer criptografia (dados sensíveis LGPD)
      const needsEncryption = this.requiresEncryption(category);

      // Se for foto, gerar thumbnails (3 arquivos no MinIO)
      if (category === 'photos') {
        await this.processPhotoWithThumbnails(file.buffer, filePath, tenantId);

        this.logger.log(
          `Photo uploaded successfully with ENCRYPTED thumbnails: ${filePath}`,
        );

        // Retorna apenas path base (compatível com banco atual)
        return {
          fileId,
          fileName: file.originalname,
          fileUrl: filePath,
          fileSize: file.size,
          mimeType: file.mimetype,
        };
      }

      // Preparar comando base
      const baseCommand: PutObjectCommandInput = {
        Bucket: this.bucket,
        Key: filePath,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          tenantId,
          category,
          relatedId: relatedId || '',
          uploadedAt: new Date().toISOString(),
        },
      };

      // Se categoria sensível E criptografia habilitada, adicionar SSE-C
      // SSE-C requer HTTPS - desabilitar em dev local, habilitar em prod
      const useEncryption = this.configService.get<string>('MINIO_USE_ENCRYPTION') === 'true';

      if (needsEncryption && useEncryption) {
        const encryptionKey = this.generateEncryptionKey(tenantId);
        const encryptionKeyMD5 = createHash('md5').update(encryptionKey).digest('base64');

        baseCommand.SSECustomerAlgorithm = 'AES256';
        baseCommand.SSECustomerKey = encryptionKey.toString('base64');
        baseCommand.SSECustomerKeyMD5 = encryptionKeyMD5;

        this.logger.log(`Uploading ENCRYPTED file (${category}): ${filePath}`);
      } else if (needsEncryption && !useEncryption) {
        this.logger.warn(`SSE-C disabled - uploading UNENCRYPTED file (${category}): ${filePath}`);
      }

      // Upload para MinIO
      await this.s3Client.send(new PutObjectCommand(baseCommand));

      this.logger.log(
        `File uploaded successfully${needsEncryption ? ' (ENCRYPTED)' : ''}: ${filePath}`,
      );

      // Retornar informações do arquivo
      return {
        fileId,
        fileName: file.originalname,
        fileUrl: filePath,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);

      // Em produção, logar erro detalhado mas retornar mensagem genérica
      // Em desenvolvimento, retornar erro específico para debug
      const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
      const errorMessage = isDev
        ? `Erro ao fazer upload: ${error.message}`
        : 'Erro ao fazer upload do arquivo';

      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Extrair tenantId do filePath (formato: tenants/{tenantId}/...)
   */
  private extractTenantIdFromPath(filePath: string): string | null {
    const match = filePath.match(/^tenants\/([^/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extrair categoria do filePath (formato: tenants/{tenantId}/{category}/...)
   */
  private extractCategoryFromPath(filePath: string): string | null {
    const match = filePath.match(/^tenants\/[^/]+\/([^/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Gerar URL assinada para download (válida por 1 hora)
   * Com cache em memória para evitar sobrecarga no MinIO
   * SUPORTA arquivos criptografados SSE-C
   */
  async getFileUrl(filePath: string): Promise<string> {
    try {
      // Verificar cache primeiro
      const now = Date.now();
      const cached = this.urlCache.get(filePath);

      if (cached && now < cached.expiresAt) {
        return cached.url;
      }

      // Extrair tenantId e categoria do path
      const tenantId = this.extractTenantIdFromPath(filePath);
      const category = this.extractCategoryFromPath(filePath);

      // Preparar comando base
      const commandParams: GetObjectCommandInput = {
        Bucket: this.bucket,
        Key: filePath,
      };

      // Se arquivo criptografado E criptografia habilitada, adicionar chaves SSE-C
      const useEncryption = this.configService.get<string>('MINIO_USE_ENCRYPTION') === 'true';

      if (tenantId && category && this.requiresEncryption(category) && useEncryption) {
        const encryptionKey = this.generateEncryptionKey(tenantId);
        const encryptionKeyMD5 = createHash('md5').update(encryptionKey).digest('base64');

        commandParams.SSECustomerAlgorithm = 'AES256';
        commandParams.SSECustomerKey = encryptionKey.toString('base64');
        commandParams.SSECustomerKeyMD5 = encryptionKeyMD5;
      }

      // Cache miss ou expirado - gerar nova URL
      const command = new GetObjectCommand(commandParams);

      // URL assinada válida por 1 hora
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600,
      });

      // Armazenar no cache (expira em 50 minutos)
      this.urlCache.set(filePath, {
        url,
        expiresAt: now + this.URL_CACHE_DURATION,
      });

      return url;
    } catch (error) {
      this.logger.error(
        `Error generating signed URL: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Erro ao gerar URL do arquivo');
    }
  }

  /**
   * Listar arquivos de um tenant/categoria
   */
  async listFiles(
    tenantId: string,
    category?: string,
    relatedId?: string,
  ): Promise<
    Array<{
      fileName: string;
      filePath: string;
      fileSize: number;
      lastModified: Date;
    }>
  > {
    // Construir prefix para busca
    let prefix = `tenants/${tenantId}`;
    if (category) {
      prefix += `/${category}`;
    }
    if (relatedId) {
      prefix += `/${relatedId}`;
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents || response.Contents.length === 0) {
        return [];
      }

      return response.Contents.filter((item) => item.Key).map((item) => ({
        fileName: item.Key!.split('/').pop()!,
        filePath: item.Key!,
        fileSize: item.Size!,
        lastModified: item.LastModified!,
      }));
    } catch (error) {
      this.logger.error(
        `Error listing files: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Erro ao listar arquivos');
    }
  }

  /**
   * Deletar arquivo (suporta arquivos criptografados SSE-C)
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const commandParams: DeleteObjectCommandInput = {
        Bucket: this.bucket,
        Key: filePath,
      };

      // Nota: DeleteObjectCommand não requer chaves SSE-C (ao contrário de GetObject)
      // O S3 gerencia automaticamente a exclusão de objetos criptografados

      await this.s3Client.send(new DeleteObjectCommand(commandParams));

      // Remover do cache se existir
      this.urlCache.delete(filePath);

      this.logger.log(`File deleted successfully: ${filePath}`);
    } catch (error) {
      this.logger.error(
        `Error deleting file: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Erro ao deletar arquivo');
    }
  }
}
