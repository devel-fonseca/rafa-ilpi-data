import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { FilesService } from '../files/files.service'
import { CreateTenantProfileDto, UpdateTenantProfileDto, CreateTenantDocumentDto, UpdateTenantDocumentDto } from './dto'
import { DocumentStatus } from '@prisma/client'
import { getRequiredDocuments, getDocumentLabel, isAllowedFileType, MAX_FILE_SIZE } from './config/document-requirements.config'

@Injectable()
export class InstitutionalProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PERFIL INSTITUCIONAL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Busca o perfil institucional do tenant
   * Retorna null se não existir
   */
  async getProfile(tenantId: string) {
    return this.prisma.tenantProfile.findFirst({
      where: { tenantId, deletedAt: null },
    })
  }

  /**
   * Cria ou atualiza o perfil institucional
   * Usa upsert para garantir que sempre exista apenas um perfil por tenant
   */
  async createOrUpdateProfile(tenantId: string, dto: CreateTenantProfileDto | UpdateTenantProfileDto) {
    // Converter foundedAt de string para Date se fornecido
    const data: any = { ...dto }
    if (data.foundedAt) {
      data.foundedAt = new Date(data.foundedAt)
    }

    return this.prisma.tenantProfile.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...data,
      },
      update: data,
    })
  }

  /**
   * Upload de logo institucional
   * Remove o logo anterior se existir
   */
  async uploadLogo(tenantId: string, file: Express.Multer.File) {
    // Validar tipo de arquivo
    if (!isAllowedFileType(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WebP.')
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    // Buscar perfil atual
    const profile = await this.getProfile(tenantId)

    // Remover logo anterior se existir
    if (profile?.logoKey) {
      try {
        await this.filesService.deleteFile(profile.logoKey)
      } catch (error) {
        // Ignorar erro se arquivo não existir
        console.warn('Erro ao deletar logo anterior:', error)
      }
    }

    // Fazer upload do novo logo
    const uploadResult = await this.filesService.uploadFile(
      file,
      'logos',
      tenantId
    )

    // Atualizar perfil com nova URL do logo
    return this.createOrUpdateProfile(tenantId, {
      logoUrl: uploadResult.fileUrl,
      logoKey: uploadResult.fileKey,
    })
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DOCUMENTOS INSTITUCIONAIS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Lista todos os documentos do tenant com filtros
   */
  async getDocuments(
    tenantId: string,
    filters?: {
      type?: string
      status?: DocumentStatus
      expiringBefore?: Date
    }
  ) {
    const where: any = {
      tenantId,
      deletedAt: null,
    }

    if (filters?.type) {
      where.type = filters.type
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.expiringBefore) {
      where.expiresAt = {
        lte: filters.expiringBefore,
      }
    }

    return this.prisma.tenantDocument.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // VENCIDO, VENCENDO, PENDENTE, OK
        { expiresAt: 'asc' },
        { createdAt: 'desc' },
      ],
    })
  }

  /**
   * Busca um documento específico
   */
  async getDocument(tenantId: string, documentId: string) {
    const document = await this.prisma.tenantDocument.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
    })

    if (!document) {
      throw new NotFoundException('Documento não encontrado')
    }

    return document
  }

  /**
   * Upload de documento institucional
   */
  async uploadDocument(
    tenantId: string,
    userId: string,
    file: Express.Multer.File,
    dto: CreateTenantDocumentDto
  ) {
    // Validar tipo de arquivo
    if (!isAllowedFileType(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WebP.')
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    // Verificar se já existe documento do mesmo tipo
    const existing = await this.prisma.tenantDocument.findFirst({
      where: {
        tenantId,
        type: dto.type,
        deletedAt: null,
      },
    })

    if (existing) {
      throw new BadRequestException(`Já existe um documento do tipo "${getDocumentLabel(dto.type)}". Atualize o existente ou remova-o primeiro.`)
    }

    // Upload do arquivo
    const uploadResult = await this.filesService.uploadFile(
      file,
      'institutional-documents',
      tenantId
    )

    // Calcular status do documento
    const status = this.calculateDocumentStatus(dto.expiresAt)

    // Criar registro do documento
    return this.prisma.tenantDocument.create({
      data: {
        tenantId,
        uploadedBy: userId,
        type: dto.type,
        fileUrl: uploadResult.fileUrl,
        fileKey: uploadResult.fileKey,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status,
        notes: dto.notes,
      },
    })
  }

  /**
   * Atualiza metadados de um documento (sem alterar o arquivo)
   */
  async updateDocumentMetadata(
    tenantId: string,
    documentId: string,
    dto: UpdateTenantDocumentDto
  ) {
    await this.getDocument(tenantId, documentId)

    const data: any = { ...dto }

    // Converter datas se fornecidas
    if (data.issuedAt) {
      data.issuedAt = new Date(data.issuedAt)
    }
    if (data.expiresAt) {
      data.expiresAt = new Date(data.expiresAt)
    }

    // Recalcular status se data de vencimento mudou
    if (data.expiresAt !== undefined) {
      data.status = this.calculateDocumentStatus(data.expiresAt)
    }

    return this.prisma.tenantDocument.update({
      where: { id: documentId },
      data,
    })
  }

  /**
   * Substitui o arquivo de um documento existente
   */
  async replaceDocumentFile(
    tenantId: string,
    documentId: string,
    file: Express.Multer.File
  ) {
    const document = await this.getDocument(tenantId, documentId)

    // Validar arquivo
    if (!isAllowedFileType(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não permitido.')
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    // Deletar arquivo anterior
    if (document.fileKey) {
      try {
        await this.filesService.deleteFile(document.fileKey)
      } catch (error) {
        console.warn('Erro ao deletar arquivo anterior:', error)
      }
    }

    // Upload novo arquivo
    const uploadResult = await this.filesService.uploadFile(
      file,
      'institutional-documents',
      tenantId
    )

    // Atualizar documento
    return this.prisma.tenantDocument.update({
      where: { id: documentId },
      data: {
        fileUrl: uploadResult.fileUrl,
        fileKey: uploadResult.fileKey,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    })
  }

  /**
   * Remove um documento (soft delete)
   */
  async deleteDocument(tenantId: string, documentId: string) {
    const document = await this.getDocument(tenantId, documentId)

    // Soft delete
    await this.prisma.tenantDocument.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    })

    // Deletar arquivo do S3 (opcional - pode manter para auditoria)
    if (document.fileKey) {
      try {
        await this.filesService.deleteFile(document.fileKey)
      } catch (error) {
        console.warn('Erro ao deletar arquivo do S3:', error)
      }
    }

    return { success: true, message: 'Documento removido com sucesso' }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // COMPLIANCE DASHBOARD
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Dashboard de compliance com estatísticas e documentos pendentes
   */
  async getComplianceDashboard(tenantId: string) {
    // Buscar perfil para saber a natureza jurídica
    const profile = await this.getProfile(tenantId)

    // Obter documentos obrigatórios baseado na natureza jurídica
    const requiredDocuments = getRequiredDocuments(profile?.legalNature)

    // Buscar todos os documentos ativos
    const documents = await this.prisma.tenantDocument.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        type: true,
        status: true,
        expiresAt: true,
        fileName: true,
      },
    })

    // Estatísticas
    const total = documents.length
    const okDocuments = documents.filter(d => d.status === 'OK').length
    const expiringDocuments = documents.filter(d => d.status === 'VENCENDO').length
    const expiredDocuments = documents.filter(d => d.status === 'VENCIDO').length
    const pendingDocuments = requiredDocuments.length - documents.filter(d => requiredDocuments.includes(d.type)).length

    // Tipos de documentos já enviados
    const uploadedDocumentTypes = documents.map(d => d.type)

    // Documentos faltantes
    const missingDocuments = requiredDocuments.filter(type => !uploadedDocumentTypes.includes(type))

    // Documentos vencidos ou vencendo (para alertas)
    const alerts = documents
      .filter(d => d.status === 'VENCIDO' || d.status === 'VENCENDO')
      .map(d => ({
        id: d.id,
        type: d.type,
        typeLabel: getDocumentLabel(d.type),
        status: d.status,
        expiresAt: d.expiresAt,
        fileName: d.fileName,
      }))

    return {
      totalDocuments: total,
      okDocuments,
      expiringDocuments,
      expiredDocuments,
      pendingDocuments,
      requiredDocuments: requiredDocuments.map(type => ({
        type,
        label: getDocumentLabel(type),
        uploaded: uploadedDocumentTypes.includes(type),
      })),
      missingDocuments: missingDocuments.map(type => ({
        type,
        label: getDocumentLabel(type),
      })),
      alerts,
      compliancePercentage: requiredDocuments.length > 0
        ? Math.round(((requiredDocuments.length - missingDocuments.length) / requiredDocuments.length) * 100)
        : 100,
    }
  }

  /**
   * Atualiza o status de todos os documentos baseado nas datas de vencimento
   * Deve ser executado periodicamente (cron job)
   */
  async updateDocumentsStatus() {
    const documents = await this.prisma.tenantDocument.findMany({
      where: { deletedAt: null, expiresAt: { not: null } },
    })

    for (const document of documents) {
      const newStatus = this.calculateDocumentStatus(document.expiresAt)

      if (newStatus !== document.status) {
        await this.prisma.tenantDocument.update({
          where: { id: document.id },
          data: { status: newStatus },
        })
      }
    }

    return { updated: documents.length }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MÉTODOS AUXILIARES
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Calcula o status do documento baseado na data de vencimento
   */
  private calculateDocumentStatus(expiresAt: string | Date | null): DocumentStatus {
    if (!expiresAt) {
      return 'OK' // Sem data de vencimento = sempre OK
    }

    const today = new Date()
    const expiration = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt

    // Zerar horas para comparação apenas de datas
    today.setHours(0, 0, 0, 0)
    expiration.setHours(0, 0, 0, 0)

    const diffDays = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return 'VENCIDO' // Já venceu
    } else if (diffDays <= 30) {
      return 'VENCENDO' // Vence em 30 dias ou menos
    } else {
      return 'OK' // Mais de 30 dias
    }
  }
}
