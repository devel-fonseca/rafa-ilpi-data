import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { FilesService } from '../files/files.service';
import { FileProcessingService } from '../files/file-processing.service';
import { StampMetadata } from '../files/interfaces/stamp-metadata.interface';
import { CreateResidentDocumentDto } from './dto/create-resident-document.dto';
import { UpdateResidentDocumentDto } from './dto/update-resident-document.dto';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

/**
 * Interface para o perfil do usuário com dados de registro profissional
 */
interface UserProfileWithRegistry {
  professionalRegistry?: string;
  professionalRegistryType?: string;
  professionalRegistryState?: string;
}

@Injectable()
export class ResidentDocumentsService {
  private readonly logger = new Logger(ResidentDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly filesService: FilesService,
    private readonly fileProcessingService: FileProcessingService,
  ) {}

  /**
   * Lista documentos de um residente com filtros opcionais
   */
  async findAll(residentId: string, type?: string) {
    const documents = await this.tenantContext.client.residentDocument.findMany({
      where: {
        residentId,
        ...(type && { type }),
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Gerar URLs assinadas para os arquivos
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        fileUrl: await this.filesService.getFileUrl(doc.fileUrl),
      })),
    );

    return documentsWithUrls;
  }

  /**
   * Busca um documento específico
   */
  async findOne(documentId: string, residentId: string) {
    const document = await this.tenantContext.client.residentDocument.findFirst({
      where: {
        id: documentId,
        residentId,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Gerar URL assinada
    return {
      ...document,
      fileUrl: await this.filesService.getFileUrl(document.fileUrl),
    };
  }

  /**
   * Faz upload de um novo documento (LEGADO - sem processamento)
   */
  async uploadDocument(
    residentId: string,
    userId: string,
    file: Express.Multer.File,
    metadata: CreateResidentDocumentDto,
  ) {
    // Verificar se o residente existe
    const resident = await this.tenantContext.client.resident.findFirst({
      where: {
        id: residentId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    // Upload do arquivo para o MinIO
    const uploadResult = await this.filesService.uploadFile(this.tenantContext.tenantId, file, 'documents', residentId);

    // Criar registro no banco
    const document = await this.tenantContext.client.residentDocument.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        residentId,
        type: metadata.type,
        details: metadata.details,
        fileUrl: uploadResult.fileUrl,
        fileKey: uploadResult.fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: userId,
      },
    });

    this.logger.log(`Documento ${document.id} criado para residente ${residentId}`);

    // Retornar com URL assinada
    return {
      ...document,
      fileUrl: await this.filesService.getFileUrl(document.fileUrl),
    };
  }

  /**
   * Faz upload de um novo documento COM PROCESSAMENTO E CARIMBO INSTITUCIONAL
   * - Converte imagem para PDF
   * - Adiciona carimbo institucional com dados do residente
   * - Gera hash SHA-256 e publicToken
   * - Armazena original + processado
   */
  async uploadDocumentWithStamp(
    residentId: string,
    userId: string,
    file: Express.Multer.File,
    metadata: CreateResidentDocumentDto,
  ) {
    const tenantId = this.tenantContext.tenantId;

    this.logger.log(`📄 [uploadDocumentWithStamp] Iniciando upload para residente ${residentId}`);

    // 1. Verificar se o residente existe
    const resident = await this.tenantContext.client.resident.findFirst({
      where: {
        id: residentId,
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        cpf: true,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    this.logger.log(`✅ [uploadDocumentWithStamp] Residente encontrado: ${resident.fullName}`);

    // 2. Buscar dados do tenant e do usuário
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, cnpj: true, timezone: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const user = await this.tenantContext.client.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    this.logger.log(`✅ [uploadDocumentWithStamp] Tenant: ${tenant.name}, Usuário: ${user.name}`);

    // 3. Gerar publicToken único
    const publicToken = randomUUID();
    this.logger.log(`🔑 [uploadDocumentWithStamp] Token público gerado: ${publicToken}`);

    // 4. Processar arquivo com FileProcessingService
    this.logger.log(`⚙️ [uploadDocumentWithStamp] Processando arquivo...`);
    const stampMetadata: StampMetadata = {
      tenantName: tenant.name,
      tenantCnpj: tenant.cnpj || 'N/A',
      tenantId,
      userName: user.name,
      userRole: user.role || 'USER',
      userProfessionalRegistry: user.profile ? this.formatProfessionalRegistry(user.profile) : undefined,
      uploadDate: new Date(),
      publicToken,
      hashOriginal: '', // Será preenchido pelo FileProcessingService
      // Adicionar dados do residente ao carimbo
      residentName: resident.fullName,
      residentCpf: resident.cpf,
    };

    try {
      const processedResult =
        file.mimetype === 'application/pdf'
          ? await this.fileProcessingService.processPdf(file.buffer, stampMetadata)
          : await this.fileProcessingService.processImage(file.buffer, stampMetadata);

      this.logger.log(`✅ [uploadDocumentWithStamp] Arquivo processado! Hash original: ${processedResult.hashOriginal}`);

      // 5. Upload do arquivo ORIGINAL para S3 (backup auditoria)
      this.logger.log(`☁️ [uploadDocumentWithStamp] Enviando arquivo ORIGINAL para S3...`);
      const originalUpload = await this.filesService.uploadFile(
        tenantId,
        file,
        'resident-documents',
        residentId
      );

      // 6. Upload do arquivo PROCESSADO para S3 (PDF com carimbo)
      this.logger.log(`☁️ [uploadDocumentWithStamp] Enviando arquivo PROCESSADO para S3...`);
      const processedFile = this.createMulterFileFromBuffer(
        processedResult.pdfBuffer,
        `${metadata.type}_${Date.now()}.pdf`,
        'application/pdf'
      );

      const processedUpload = await this.filesService.uploadFile(
        tenantId,
        processedFile,
        'resident-documents',
        residentId
      );

      // 7. Criar registro do documento com TODOS os campos
      this.logger.log(`💾 [uploadDocumentWithStamp] Salvando no banco de dados...`);
      const document = await this.tenantContext.client.residentDocument.create({
        data: {
          tenantId,
          residentId,
          uploadedBy: userId,
          type: metadata.type,
          details: metadata.details,

          // Arquivo ORIGINAL (backup auditoria)
          originalFileUrl: originalUpload.fileUrl,
          originalFileKey: originalUpload.fileUrl,
          originalFileName: file.originalname,
          originalFileSize: file.size,
          originalFileMimeType: file.mimetype,
          originalFileHash: processedResult.hashOriginal,

          // Arquivo PROCESSADO (PDF com carimbo)
          processedFileUrl: processedUpload.fileUrl,
          processedFileKey: processedUpload.fileUrl,
          processedFileName: processedFile.originalname,
          processedFileSize: processedFile.size,
          processedFileHash: processedResult.hashFinal,

          // Token público para validação
          publicToken,

          // Metadados do processamento
          processingMetadata: {
            processedAt: new Date().toISOString(),
            processorVersion: '1.0.0',
            validatorName: user.name,
            tenantName: tenant.name,
            residentName: resident.fullName,
            residentCpf: resident.cpf,
          },

          // Campos LEGADOS (para backward compatibility)
          fileUrl: processedUpload.fileUrl,
          fileKey: processedUpload.fileUrl,
          fileName: processedFile.originalname,
          fileSize: processedFile.size,
          mimeType: 'application/pdf',
        },
      });

      this.logger.log(`✅ [uploadDocumentWithStamp] Documento ${document.id} criado com sucesso!`);

      // Retornar com URL assinada
      return {
        ...document,
        fileUrl: await this.filesService.getFileUrl(document.fileUrl),
        originalFileUrl: await this.filesService.getFileUrl(document.originalFileUrl!),
        processedFileUrl: await this.filesService.getFileUrl(document.processedFileUrl!),
      };
    } catch (error) {
      this.logger.error(`❌ [uploadDocumentWithStamp] Erro no processamento:`, error);
      throw error;
    }
  }

  /**
   * Formata registro profissional do usuário
   */
  private formatProfessionalRegistry(profile: UserProfileWithRegistry): string {
    if (!profile?.professionalRegistry) {
      return 'N/A';
    }

    const type = profile.professionalRegistryType || 'REG';
    const number = profile.professionalRegistry;
    const state = profile.professionalRegistryState || '';

    return state ? `${type} ${number}/${state}` : `${type} ${number}`;
  }

  /**
   * Cria um objeto Multer.File a partir de um buffer
   */
  private createMulterFileFromBuffer(
    buffer: Buffer,
    originalname: string,
    mimetype: string
  ): Express.Multer.File {
    return {
      buffer,
      originalname,
      mimetype,
      size: buffer.length,
      fieldname: 'file',
      encoding: '7bit',
      stream: Readable.from(buffer),
      destination: '',
      filename: '',
      path: '',
    };
  }

  /**
   * Atualiza metadados de um documento (tipo, detalhes)
   */
  async updateMetadata(
    documentId: string,
    residentId: string,
    updateDto: UpdateResidentDocumentDto,
  ) {
    const document = await this.tenantContext.client.residentDocument.findFirst({
      where: {
        id: documentId,
        residentId,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    const updated = await this.tenantContext.client.residentDocument.update({
      where: { id: documentId },
      data: {
        ...(updateDto.type && { type: updateDto.type }),
        ...(updateDto.details !== undefined && { details: updateDto.details }),
      },
    });

    this.logger.log(`Documento ${documentId} atualizado`);

    return {
      ...updated,
      fileUrl: await this.filesService.getFileUrl(updated.fileUrl),
    };
  }

  /**
   * Substitui o arquivo de um documento existente
   */
  async replaceFile(
    documentId: string,
    residentId: string,
    file: Express.Multer.File,
  ) {
    const document = await this.tenantContext.client.residentDocument.findFirst({
      where: {
        id: documentId,
        residentId,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Deletar arquivo antigo do MinIO
    try {
      await this.filesService.deleteFile(document.fileKey || document.fileUrl);
    } catch (error) {
      this.logger.warn(`Erro ao deletar arquivo antigo: ${error.message}`);
    }

    // Upload do novo arquivo
    const uploadResult = await this.filesService.uploadFile(this.tenantContext.tenantId, file, 'documents', residentId);

    // Atualizar registro
    const updated = await this.tenantContext.client.residentDocument.update({
      where: { id: documentId },
      data: {
        fileUrl: uploadResult.fileUrl,
        fileKey: uploadResult.fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });

    this.logger.log(`Arquivo do documento ${documentId} substituído`);

    return {
      ...updated,
      fileUrl: await this.filesService.getFileUrl(updated.fileUrl),
    };
  }

  /**
   * Deleta um documento (soft delete)
   */
  async deleteDocument(documentId: string, residentId: string) {
    const document = await this.tenantContext.client.residentDocument.findFirst({
      where: {
        id: documentId,
        residentId,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Soft delete
    await this.tenantContext.client.residentDocument.update({
      where: { id: documentId },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.log(`Documento ${documentId} deletado`);

    // Tentar deletar arquivo do MinIO
    try {
      await this.filesService.deleteFile(document.fileKey || document.fileUrl);
    } catch (error) {
      this.logger.warn(`Erro ao deletar arquivo do MinIO: ${error.message}`);
    }

    return { message: 'Documento deletado com sucesso' };
  }
}
