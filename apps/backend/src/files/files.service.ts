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

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

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
      // Upload para MinIO
      await this.s3Client.send(
        new PutObjectCommand({
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
        }),
      );

      this.logger.log(`File uploaded successfully: ${filePath}`);

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
      throw new BadRequestException('Erro ao fazer upload do arquivo');
    }
  }

  /**
   * Gerar URL assinada para download (válida por 1 hora)
   */
  async getFileUrl(filePath: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      });

      // URL assinada válida por 1 hora
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600,
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
   * Deletar arquivo
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: filePath,
        }),
      );

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
