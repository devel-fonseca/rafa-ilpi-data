import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { FilesService } from '../files/files.service';
import { CreateResidentDocumentDto } from './dto/create-resident-document.dto';
import { UpdateResidentDocumentDto } from './dto/update-resident-document.dto';

@Injectable()
export class ResidentDocumentsService {
  private readonly logger = new Logger(ResidentDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly filesService: FilesService,
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
   * Faz upload de um novo documento
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
