import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TenantContextService } from '../prisma/tenant-context.service'
import {
  Pop,
  PopStatus,
  PopAction,
  PopHistory,
  PopAttachment,
  PopCategory,
  PermissionType,
  Prisma,
} from '@prisma/client'
import {
  CreatePopDto,
  UpdatePopDto,
  CreatePopVersionDto,
  FilterPopsDto,
  AddAttachmentDto,
} from './dto'
import { addMonths } from 'date-fns'
import { getPositionProfile } from '../permissions/position-profiles.config'

/**
 * Service responsável pela lógica de negócio de POPs
 *
 * Funcionalidades:
 * - CRUD completo
 * - Versionamento com auto-referência
 * - Workflow: DRAFT → PUBLISHED → OBSOLETE
 * - Sistema de revisão periódica
 * - Anexos e histórico de alterações
 */
@Injectable()
export class PopsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
  ) {}

  /**
   * Cria um novo POP no status DRAFT
   */
  async create(
    userId: string,
    dto: CreatePopDto,
  ): Promise<Pop> {
    console.log('🔍 [POPs] create() chamado:', { tenantId: this.tenantContext.tenantId, userId, dto })

    // Calcular próxima data de revisão se intervalo definido
    const nextReviewDate = dto.reviewIntervalMonths
      ? addMonths(new Date(), dto.reviewIntervalMonths)
      : null

    const now = new Date()
    console.log('⏰ [POPs] Criando com now:', now)

    try {
      const pop = await this.tenantContext.client.pop.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          title: dto.title,
          category: dto.category as PopCategory,
          templateId: dto.templateId,
          content: dto.content,
          status: PopStatus.DRAFT,
          version: 1,
          reviewIntervalMonths: dto.reviewIntervalMonths,
          nextReviewDate,
          notes: dto.notes,
          createdBy: userId,
          updatedAt: now,
        },
        include: {
          attachments: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
          },
          history: {
            orderBy: { changedAt: 'desc' },
            take: 5,
          },
        },
      })

      console.log('✅ [POPs] POP criado com sucesso:', pop.id)

      // Criar registro de histórico
      await this.createHistoryRecord(
        pop.id,
        PopAction.CREATED,
        userId,
        null,
        pop,
        'POP criado',
      )

      console.log('✅ [POPs] Histórico criado com sucesso')

      return pop
    } catch (error) {
      console.error('❌ [POPs] Erro ao criar POP:', error)
      throw error
    }
  }

  /**
   * Retorna categorias únicas usadas pelos POPs do tenant
   */
  async getUniqueCategories(): Promise<string[]> {
    const pops = await this.tenantContext.client.pop.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        category: true,
      },
      distinct: ['category'],
    })

    return pops.map((pop) => pop.category).sort()
  }

  /**
   * Busca todos os POPs de um tenant com filtros
   */
  async findAll(
    filters?: FilterPopsDto,
  ): Promise<Pop[]> {
    const where: Prisma.PopWhereInput = {
      deletedAt: null,
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.category) {
      where.category = filters.category
    }

    if (filters?.requiresReview !== undefined) {
      where.requiresReview = filters.requiresReview
    }

    if (filters?.templateId) {
      where.templateId = filters.templateId
    }

    if (filters?.search) {
      where.title = {
        contains: filters.search,
        mode: 'insensitive',
      }
    }

    return this.tenantContext.client.pop.findMany({
      where,
      include: {
        attachments: {
          where: { deletedAt: null },
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            description: true,
            type: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            attachments: {
              where: { deletedAt: null },
            },
            history: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    })
  }

  /**
   * Busca apenas POPs publicados (vigentes)
   */
  async findPublished(): Promise<Pop[]> {
    return this.tenantContext.client.pop.findMany({
      where: {
        status: PopStatus.PUBLISHED,
        deletedAt: null,
      },
      include: {
        attachments: {
          where: { deletedAt: null },
        },
      },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    })
  }

  /**
   * Busca um POP por ID
   */
  async findOne(popId: string): Promise<Pop> {
    const pop = await this.tenantContext.client.pop.findFirst({
      where: {
        id: popId,
        deletedAt: null,
      },
      include: {
        attachments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        replacedBy: {
          select: {
            id: true,
            title: true,
            version: true,
            status: true,
            createdAt: true,
          },
        },
        replaces: {
          select: {
            id: true,
            title: true,
            version: true,
            status: true,
            createdAt: true,
          },
          orderBy: { version: 'desc' },
        },
      },
    })

    if (!pop) {
      throw new NotFoundException('POP não encontrado')
    }

    return pop
  }

  /**
   * Busca um POP por ID com validação de acesso público
   * - POPs PUBLISHED: Todos podem visualizar
   * - POPs DRAFT/OBSOLETE: Apenas usuários com VIEW_POPS
   */
  async findOnePublic(
    popId: string,
    userId: string,
  ): Promise<Pop> {
    const pop = await this.tenantContext.client.pop.findFirst({
      where: {
        id: popId,
        deletedAt: null,
      },
      include: {
        attachments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        replacedBy: {
          select: {
            id: true,
            title: true,
            version: true,
            status: true,
            createdAt: true,
          },
        },
        replaces: {
          select: {
            id: true,
            title: true,
            version: true,
            status: true,
            createdAt: true,
          },
          orderBy: { version: 'desc' },
        },
      },
    })

    if (!pop) {
      throw new NotFoundException('POP não encontrado')
    }

    // Se o POP não está publicado, bloqueia acesso de usuários comuns
    if (pop.status !== PopStatus.PUBLISHED) {
      // Verificar se usuário tem permissão VIEW_POPS ou role=admin
      const user = await this.tenantContext.client.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          profile: {
            select: {
              positionCode: true,
              customPermissions: {
                select: {
                  permission: true,
                  isGranted: true,
                },
              },
            },
          },
        },
      })

      // Se é ADMIN, permite acesso (bypass) (case-insensitive)
      if (user?.role?.toLowerCase() === 'admin') {
        return pop
      }

      // Verificar permissões do cargo + customizações
      if (user?.profile) {
        const { positionCode, customPermissions } = user.profile

        // Buscar permissões do cargo
        let hasViewPops = false
        if (positionCode) {
          const positionProfile = getPositionProfile(positionCode)
          hasViewPops = positionProfile?.permissions.includes(
            PermissionType.VIEW_POPS,
          ) || false
        }

        // Aplicar customizações (override)
        for (const customPerm of customPermissions) {
          if (customPerm.permission === PermissionType.VIEW_POPS) {
            hasViewPops = customPerm.isGranted
          }
        }

        // Se tem VIEW_POPS, permite acesso
        if (hasViewPops) {
          return pop
        }
      }

      // Caso contrário, bloqueia
      throw new BadRequestException(
        'Este POP está em rascunho e não está disponível para visualização',
      )
    }

    return pop
  }

  /**
   * Atualiza um POP (apenas se status = DRAFT)
   */
  async update(
    popId: string,
    userId: string,
    dto: UpdatePopDto,
  ): Promise<Pop> {
    const existingPop = await this.findOne(popId)

    if (existingPop.status !== PopStatus.DRAFT) {
      throw new BadRequestException(
        'Apenas POPs em rascunho podem ser atualizados. Para POPs publicados, crie uma nova versão.',
      )
    }

    const updateData: Prisma.PopUpdateInput = {
      updatedBy: userId,
    }

    if (dto.title) updateData.title = dto.title
    if (dto.content) updateData.content = dto.content
    if (dto.notes !== undefined) updateData.notes = dto.notes

    if (dto.reviewIntervalMonths !== undefined) {
      updateData.reviewIntervalMonths = dto.reviewIntervalMonths
      updateData.nextReviewDate = dto.reviewIntervalMonths
        ? addMonths(new Date(), dto.reviewIntervalMonths)
        : null
    }

    const updatedPop = await this.tenantContext.client.pop.update({
      where: { id: popId },
      data: updateData,
      include: {
        attachments: {
          where: { deletedAt: null },
        },
      },
    })

    // Criar registro de histórico
    await this.createHistoryRecord(
      popId,
      PopAction.UPDATED,
      userId,
      existingPop,
      updatedPop,
      'POP atualizado',
      Object.keys(dto),
    )

    return updatedPop
  }

  /**
   * Remove um POP (soft delete)
   */
  async remove(popId: string, userId: string): Promise<void> {
    const pop = await this.findOne(popId)

    if (pop.status === PopStatus.PUBLISHED) {
      throw new BadRequestException(
        'POPs publicados não podem ser removidos. Marque como obsoleto ou crie uma nova versão.',
      )
    }

    await this.tenantContext.client.pop.update({
      where: { id: popId },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    })

    // Criar registro de histórico
    await this.createHistoryRecord(
      popId,
      PopAction.DELETED,
      userId,
      pop,
      null,
      'POP removido',
    )
  }

  /**
   * Cria uma nova versão de um POP PUBLISHED
   *
   * Processo:
   * 1. Cria novo POP (DRAFT) com version++
   * 2. Atualiza POP anterior: status=OBSOLETE, replacedById=novo.id
   * 3. Cria 2 registros de histórico (OBSOLETED + VERSIONED)
   */
  async createNewVersion(
    popId: string,
    userId: string,
    dto: CreatePopVersionDto,
  ): Promise<Pop> {
    const existingPop = await this.findOne(popId)

    if (existingPop.status !== PopStatus.PUBLISHED) {
      throw new BadRequestException(
        'Apenas POPs publicados podem ter novas versões criadas',
      )
    }

    // Executar em transação para garantir consistência
    return this.tenantContext.client.$transaction(async (tx) => {
      // 1. Criar novo POP com versão incrementada
      const newVersion = await tx.pop.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          title: dto.newTitle || existingPop.title,
          category: existingPop.category,
          templateId: existingPop.templateId,
          content: dto.newContent,
          status: PopStatus.DRAFT,
          version: existingPop.version + 1,
          reviewIntervalMonths:
            dto.newReviewIntervalMonths !== undefined
              ? dto.newReviewIntervalMonths
              : existingPop.reviewIntervalMonths,
          nextReviewDate:
            dto.newReviewIntervalMonths !== undefined
              ? dto.newReviewIntervalMonths
                ? addMonths(new Date(), dto.newReviewIntervalMonths)
                : null
              : existingPop.nextReviewDate,
          notes: dto.newNotes,
          createdBy: userId,
        },
      })

      // 2. Marcar versão anterior como obsoleta
      await tx.pop.update({
        where: { id: popId },
        data: {
          status: PopStatus.OBSOLETE,
          replacedById: newVersion.id,
          replacedAt: new Date(),
          updatedBy: userId,
        },
      })

      // 3. Criar registros de histórico
      await tx.popHistory.createMany({
        data: [
          {
            tenantId: this.tenantContext.tenantId,
            popId: existingPop.id,
            action: PopAction.OBSOLETED,
            reason: dto.reason,
            previousData: existingPop as Prisma.InputJsonValue,
            newData: { replacedById: newVersion.id } as Prisma.InputJsonValue,
            changedFields: ['status', 'replacedById', 'replacedAt'],
            changedBy: userId,
            changedByName: 'Sistema', // Atualizar com nome real do usuário
          },
          {
            tenantId: this.tenantContext.tenantId,
            popId: newVersion.id,
            action: PopAction.VERSIONED,
            reason: dto.reason,
            previousData: existingPop as Prisma.InputJsonValue,
            newData: newVersion as Prisma.InputJsonValue,
            changedFields: ['content', 'version'],
            changedBy: userId,
            changedByName: 'Sistema', // Atualizar com nome real do usuário
          },
        ],
      })

      const createdPop = await tx.pop.findUnique({
        where: { id: newVersion.id },
        include: {
          attachments: true,
          replaces: {
            select: {
              id: true,
              title: true,
              version: true,
              status: true,
            },
          },
        },
      })

      if (!createdPop) {
        throw new Error('Erro ao criar nova versão do POP')
      }

      return createdPop
    })
  }

  /**
   * Busca histórico de versões de um POP
   */
  async getVersionHistory(popId: string): Promise<Partial<Pop>[]> {
    const pop = await this.findOne(popId)

    // Buscar toda a cadeia de versões (anteriores e posteriores)
    const allVersions = await this.tenantContext.client.pop.findMany({
      where: {
        templateId: pop.templateId,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        title: true,
        version: true,
        status: true,
        content: true,
        createdAt: true,
        publishedAt: true,
        replacedAt: true,
        createdBy: true,
        publishedBy: true,
      },
    })

    return allVersions
  }

  /**
   * Publica um POP (DRAFT → PUBLISHED)
   */
  async publish(popId: string, userId: string): Promise<Pop> {
    const pop = await this.findOne(popId)

    if (pop.status !== PopStatus.DRAFT) {
      throw new BadRequestException('Apenas POPs em rascunho podem ser publicados')
    }

    const now = new Date()
    const nextReviewDate = pop.reviewIntervalMonths
      ? addMonths(now, pop.reviewIntervalMonths)
      : null

    const publishedPop = await this.tenantContext.client.pop.update({
      where: { id: popId },
      data: {
        status: PopStatus.PUBLISHED,
        publishedBy: userId,
        publishedAt: now,
        lastReviewedAt: now,
        nextReviewDate,
        requiresReview: false,
        updatedBy: userId,
      },
      include: {
        attachments: {
          where: { deletedAt: null },
        },
      },
    })

    // Criar registro de histórico
    await this.createHistoryRecord(
      popId,
      PopAction.PUBLISHED,
      userId,
      pop,
      publishedPop,
      'POP publicado',
      ['status', 'publishedBy', 'publishedAt'],
    )

    return publishedPop
  }

  /**
   * Marca um POP como obsoleto
   */
  async markObsolete(
    popId: string,
    userId: string,
    reason: string,
  ): Promise<Pop> {
    const pop = await this.findOne(popId)

    if (pop.status !== PopStatus.PUBLISHED) {
      throw new BadRequestException(
        'Apenas POPs publicados podem ser marcados como obsoletos',
      )
    }

    const obsoletePop = await this.tenantContext.client.pop.update({
      where: { id: popId },
      data: {
        status: PopStatus.OBSOLETE,
        updatedBy: userId,
        replacedAt: new Date(),
      },
    })

    // Criar registro de histórico
    await this.createHistoryRecord(
      popId,
      PopAction.OBSOLETED,
      userId,
      pop,
      obsoletePop,
      reason,
      ['status', 'replacedAt'],
    )

    return obsoletePop
  }

  /**
   * Adiciona anexo a um POP
   */
  async addAttachment(
    popId: string,
    userId: string,
    fileUrl: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    dto?: AddAttachmentDto,
  ): Promise<PopAttachment> {
    // Verificar se POP existe
    await this.findOne(popId)

    return this.tenantContext.client.popAttachment.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        popId,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
        description: dto?.description,
        type: dto?.type,
        uploadedBy: userId,
      },
    })
  }

  /**
   * Remove anexo de um POP (soft delete)
   */
  async removeAttachment(
    attachmentId: string,
  ): Promise<void> {
    const attachment = await this.tenantContext.client.popAttachment.findFirst({
      where: {
        id: attachmentId,
        deletedAt: null,
      },
    })

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado')
    }

    await this.tenantContext.client.popAttachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    })
  }

  /**
   * Busca histórico de alterações de um POP
   */
  async getPopHistory(
    popId: string,
  ): Promise<PopHistory[]> {
    await this.findOne(popId) // Valida existência

    return this.tenantContext.client.popHistory.findMany({
      where: {
        popId,
      },
      orderBy: { changedAt: 'desc' },
    })
  }

  /**
   * Marca um POP como revisado (atualiza datas de revisão)
   */
  async markAsReviewed(
    popId: string,
    userId: string,
  ): Promise<Pop> {
    const pop = await this.findOne(popId)

    if (pop.status !== PopStatus.PUBLISHED) {
      throw new BadRequestException(
        'Apenas POPs publicados podem ser marcados como revisados',
      )
    }

    const now = new Date()
    const nextReviewDate = pop.reviewIntervalMonths
      ? addMonths(now, pop.reviewIntervalMonths)
      : null

    const reviewedPop = await this.tenantContext.client.pop.update({
      where: { id: popId },
      data: {
        lastReviewedAt: now,
        nextReviewDate,
        requiresReview: false,
        updatedBy: userId,
      },
    })

    // Criar registro de histórico
    await this.createHistoryRecord(
      popId,
      PopAction.UPDATED,
      userId,
      pop,
      reviewedPop,
      'POP marcado como revisado sem alterações',
      ['lastReviewedAt', 'nextReviewDate', 'requiresReview'],
    )

    return reviewedPop
  }

  /**
   * Atualiza flags de revisão para POPs que necessitam revisão
   * (Chamado pelo cron job diário)
   * NOTA: Este método é executado globalmente para todos os tenants (não usa tenant context)
   */
  async updateReviewFlags(): Promise<{ updated: number }> {
    const today = new Date()

    // Buscar POPs PUBLISHED que precisam de revisão (GLOBAL - sem tenant context)
    const popsToUpdate = await this.tenantContext.client.pop.findMany({
      where: {
        status: PopStatus.PUBLISHED,
        nextReviewDate: {
          lte: today,
        },
        requiresReview: false,
        deletedAt: null,
      },
    })

    if (popsToUpdate.length === 0) {
      return { updated: 0 }
    }

    // Marcar como precisando revisão (GLOBAL)
    await this.tenantContext.client.pop.updateMany({
      where: {
        id: {
          in: popsToUpdate.map((p) => p.id),
        },
      },
      data: {
        requiresReview: true,
      },
    })

    return { updated: popsToUpdate.length }
  }

  /**
   * Cria registro de histórico de alterações
   * (Método privado auxiliar)
   */
  private async createHistoryRecord(
    popId: string,
    action: PopAction,
    userId: string,
    previousData: Pop | Partial<Pop> | null,
    newData: Pop | Partial<Pop> | null,
    reason?: string,
    changedFields: string[] = [],
  ): Promise<void> {
    await this.tenantContext.client.popHistory.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        popId,
        action,
        reason,
        previousData: previousData ? (previousData as Prisma.InputJsonValue) : Prisma.JsonNull,
        newData: newData ? (newData as Prisma.InputJsonValue) : Prisma.JsonNull,
        changedFields,
        changedBy: userId,
        changedByName: 'Sistema', // TODO: Buscar nome real do usuário
      },
    })
  }
}
