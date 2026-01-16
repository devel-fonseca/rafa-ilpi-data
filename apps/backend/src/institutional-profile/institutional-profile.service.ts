import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TenantContextService } from '../prisma/tenant-context.service'
import { FilesService } from '../files/files.service'
import { CreateTenantProfileDto, UpdateTenantProfileDto, CreateTenantDocumentDto, UpdateTenantDocumentDto, UpdateInstitutionalProfileDto } from './dto'
import { DocumentStatus, Prisma } from '@prisma/client'
import { getRequiredDocuments, getDocumentLabel, isAllowedFileType, MAX_FILE_SIZE } from './config/document-requirements.config'
import { getCurrentDateInTz } from '../utils/date.helpers'
import { formatDateOnly } from '../utils/date.helpers'
import { parseISO } from 'date-fns'

@Injectable()
export class InstitutionalProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
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
    return this.tenantContext.client.tenantProfile.findFirst({
      where: { tenantId, deletedAt: null },
    })
  }

  /**
   * Busca dados combinados do tenant e perfil institucional
   * Retorna dados completos para exibição no formulário
   */
  async getFullProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        cnpj: true,
        email: true,
        phone: true,
        addressStreet: true,
        addressNumber: true,
        addressComplement: true,
        addressDistrict: true,
        addressCity: true,
        addressState: true,
        addressZipCode: true,
      },
    })

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado')
    }

    const profile = await this.getProfile(tenantId)

    // Se houver logo, gerar URL pré-assinada
    if (profile?.logoUrl) {
      const signedUrl = await this.filesService.getFileUrl(profile.logoUrl)
      return {
        tenant,
        profile: {
          ...profile,
          logoUrl: signedUrl, // Substituir path relativo por URL assinada
        },
      }
    }

    return {
      tenant,
      profile,
    }
  }

  /**
   * Cria ou atualiza o perfil institucional
   * Usa upsert para garantir que sempre exista apenas um perfil por tenant
   */
  async createOrUpdateProfile(tenantId: string, dto: CreateTenantProfileDto | UpdateTenantProfileDto) {
    // Converter foundedAt de string para Date se fornecido
    const { foundedAt, ...rest } = dto
    const processedData = {
      ...rest,
      ...(foundedAt ? { foundedAt: parseISO(`${foundedAt}T12:00:00.000`) } : {}),
    }

    return this.tenantContext.client.tenantProfile.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...processedData,
      } as Prisma.TenantProfileUncheckedCreateInput,
      update: processedData as Prisma.TenantProfileUpdateInput,
    })
  }

  /**
   * Atualiza perfil institucional e dados do tenant em uma transação atômica
   * Sincroniza telefone e email entre tenant e tenant_profile
   */
  async updateFullProfile(tenantId: string, dto: UpdateInstitutionalProfileDto) {
    console.log('🔍 updateFullProfile - tenantId:', tenantId)
    console.log('🔍 updateFullProfile - dto:', JSON.stringify(dto, null, 2))

    return this.prisma.$transaction(async (tx) => {
      let updatedTenant = null
      let updatedProfile = null

      // 1. Atualizar dados do tenant se fornecidos
      if (dto.tenant && Object.keys(dto.tenant).length > 0) {
        const tenantData: Prisma.TenantUpdateInput = { ...dto.tenant }
        console.log('🔍 Atualizando tenant com:', JSON.stringify(tenantData, null, 2))

        updatedTenant = await tx.tenant.update({
          where: { id: tenantId },
          data: tenantData,
        })
        console.log('✅ Tenant atualizado:', JSON.stringify(updatedTenant, null, 2))
      }

      // 2. Atualizar perfil institucional se fornecido
      if (dto.profile && Object.keys(dto.profile).length > 0) {
        const profileData: Prisma.TenantProfileUncheckedCreateInput | Prisma.TenantProfileUpdateInput = { ...dto.profile }

        // Converter foundedAt se fornecido
        if (profileData.foundedAt) {
          profileData.foundedAt = new Date(profileData.foundedAt as string)
        }

        // Sincronizar telefone e email do tenant para o profile
        if (dto.tenant?.phone) {
          profileData.contactPhone = dto.tenant.phone
        }
        if (dto.tenant?.email) {
          profileData.contactEmail = dto.tenant.email
        }

        console.log('🔍 Atualizando profile com:', JSON.stringify(profileData, null, 2))

        updatedProfile = await tx.tenantProfile.upsert({
          where: { tenantId },
          create: {
            tenantId,
            ...profileData,
          } as Prisma.TenantProfileUncheckedCreateInput,
          update: profileData as Prisma.TenantProfileUpdateInput,
        })
        console.log('✅ Profile atualizado:', JSON.stringify(updatedProfile, null, 2))
      }

      // 3. Buscar dados atualizados completos
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          cnpj: true,
          email: true,
          phone: true,
          addressStreet: true,
          addressNumber: true,
          addressComplement: true,
          addressDistrict: true,
          addressCity: true,
          addressState: true,
          addressZipCode: true,
        },
      })

      const profile = await tx.tenantProfile.findFirst({
        where: { tenantId, deletedAt: null },
      })

      return {
        tenant,
        profile,
      }
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
      tenantId,
      file,
      'logos'
    )

    // Atualizar perfil diretamente no banco com nova URL do logo
    return this.tenantContext.client.tenantProfile.upsert({
      where: { tenantId },
      create: {
        tenantId,
        logoUrl: uploadResult.fileUrl,
        logoKey: uploadResult.fileId,
      },
      update: {
        logoUrl: uploadResult.fileUrl,
        logoKey: uploadResult.fileId,
      },
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
    const where: Prisma.TenantDocumentWhereInput = {
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

    const documents = await this.prisma.tenantDocument.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // VENCIDO, VENCENDO, PENDENTE, OK
        { expiresAt: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Gerar presigned URLs para todos os documentos
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const signedUrl = await this.filesService.getFileUrl(doc.fileUrl)
        return {
          ...doc,
          fileUrl: signedUrl,
        }
      })
    )

    return documentsWithUrls
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

    // Gerar presigned URL para o documento
    const signedUrl = await this.filesService.getFileUrl(document.fileUrl)

    return {
      ...document,
      fileUrl: signedUrl,
    }
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

    // Upload do arquivo
    const uploadResult = await this.filesService.uploadFile(
      tenantId,
      file,
      'institutional-documents'
    )

    // Buscar timezone do tenant para cálculo correto do status
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    })
    const timezone = tenant?.timezone || 'America/Sao_Paulo'

    // Calcular status do documento (timezone-safe)
    const status = this.calculateDocumentStatus(dto.expiresAt || null, timezone)

    // Criar registro do documento
    return this.prisma.tenantDocument.create({
      data: {
        tenantId,
        uploadedBy: userId,
        type: dto.type,
        fileUrl: uploadResult.fileUrl,
        fileKey: uploadResult.fileId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status,
        documentNumber: dto.documentNumber,
        issuerEntity: dto.issuerEntity,
        tags: dto.tags || [],
        notes: dto.notes,
        version: 1, // Novo documento sempre começa na versão 1
      },
    })
  }

  /**
   * Cria registro de documento a partir de arquivo já enviado
   * (usado quando o arquivo é enviado primeiro via /files/upload)
   */
  async createDocumentWithFileUrl(
    tenantId: string,
    userId: string,
    dto: CreateTenantDocumentDto & {
      fileUrl: string
      fileKey: string
      fileName: string
      fileSize: number
      mimeType: string
    }
  ) {
    // Buscar timezone do tenant para cálculo correto do status
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    })
    const timezone = tenant?.timezone || 'America/Sao_Paulo'

    // Calcular status do documento (timezone-safe)
    const status = this.calculateDocumentStatus(dto.expiresAt || null, timezone)

    // Criar registro do documento
    return this.prisma.tenantDocument.create({
      data: {
        tenantId,
        uploadedBy: userId,
        type: dto.type,
        fileUrl: dto.fileUrl,
        fileKey: dto.fileKey,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status,
        documentNumber: dto.documentNumber,
        issuerEntity: dto.issuerEntity,
        tags: dto.tags || [],
        notes: dto.notes,
        version: 1,
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

    const data: Prisma.TenantDocumentUpdateInput = { ...dto }

    // Converter datas se fornecidas
    if (data.issuedAt) {
      data.issuedAt = new Date(data.issuedAt as string)
    }
    if (data.expiresAt) {
      data.expiresAt = new Date(data.expiresAt as string)
    }

    // Recalcular status se data de vencimento mudou
    if (data.expiresAt !== undefined) {
      // Buscar timezone do tenant para cálculo correto do status
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { timezone: true },
      })
      const timezone = tenant?.timezone || 'America/Sao_Paulo'

      data.status = this.calculateDocumentStatus(data.expiresAt, timezone)
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
      tenantId,
      file,
      'institutional-documents'
    )

    // Atualizar documento
    return this.prisma.tenantDocument.update({
      where: { id: documentId },
      data: {
        fileUrl: uploadResult.fileUrl,
        fileKey: uploadResult.fileId,
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

    // Tipos de documentos considerados "atendidos" = que têm pelo menos 1 documento vigente (OK ou VENCENDO)
    // Documentos VENCIDOS não contam para compliance (precisam ser renovados)
    const uploadedDocumentTypes = documents
      .filter(d => d.status === 'OK' || d.status === 'VENCENDO')
      .map(d => d.type)

    // Documentos faltantes (tipos que não possuem nenhum documento vigente)
    const missingDocuments = requiredDocuments.filter(type => !uploadedDocumentTypes.includes(type))

    // Conta quantos tipos obrigatórios estão pendentes (sem nenhum documento vigente)
    const pendingDocuments = missingDocuments.length

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
      include: {
        tenant: {
          select: { timezone: true },
        },
      },
    })

    for (const document of documents) {
      const timezone = document.tenant?.timezone || 'America/Sao_Paulo'
      const newStatus = this.calculateDocumentStatus(document.expiresAt, timezone)

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
   * @param expiresAt Data de vencimento (YYYY-MM-DD string ou Date)
   * @param timezone Timezone IANA do tenant para determinar "hoje" corretamente
   */
  private calculateDocumentStatus(
    expiresAt: string | Date | null,
    timezone: string = 'America/Sao_Paulo'
  ): DocumentStatus {
    if (!expiresAt) {
      return 'OK' // Sem data de vencimento = sempre OK
    }

    // Obter data civil HOJE no timezone do tenant (timezone-safe)
    const todayStr = getCurrentDateInTz(timezone)

    // Extrair data civil do vencimento (YYYY-MM-DD)
    const expirationStr = typeof expiresAt === 'string'
      ? expiresAt.substring(0, 10) // Truncar se vier com hora
      : formatDateOnly(expiresAt)

    // Comparação de strings YYYY-MM-DD (timezone-safe)
    const today = new Date(todayStr + 'T12:00:00')
    const expiration = new Date(expirationStr + 'T12:00:00')

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
