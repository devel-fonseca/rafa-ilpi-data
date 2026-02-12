import { Injectable, NotFoundException } from '@nestjs/common'
import { PositionCode } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

interface RecipientQueryOptions {
  positionCodes?: PositionCode[]
  includeTechnicalManagerFlag?: boolean
  includeLegacyAdminRole?: boolean
  includeUserIds?: string[]
}

@Injectable()
export class NotificationRecipientsResolverService {
  private readonly RECIPIENTS_TTL_MS = 2 * 60 * 1000
  private readonly SCHEMA_TTL_MS = 5 * 60 * 1000

  private readonly recipientsCache = new Map<string, { expiresAt: number; ids: string[] }>()
  private readonly schemaCache = new Map<string, { expiresAt: number; schemaName: string }>()

  constructor(private readonly prisma: PrismaService) {}

  async resolveByTenantId(
    tenantId: string,
    options: RecipientQueryOptions,
  ): Promise<string[]> {
    const schemaName = await this.resolveSchemaName(tenantId)
    return this.resolveBySchemaName(schemaName, options)
  }

  async resolveBySchemaName(
    schemaName: string,
    options: RecipientQueryOptions,
  ): Promise<string[]> {
    const cacheKey = this.buildCacheKey(schemaName, options)
    const now = Date.now()
    const cached = this.recipientsCache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      return cached.ids
    }

    const orConditions: Array<Record<string, unknown>> = []

    if (options.positionCodes && options.positionCodes.length > 0) {
      orConditions.push({
        profile: {
          is: {
            positionCode: {
              in: options.positionCodes,
            },
          },
        },
      })
    }

    if (options.includeTechnicalManagerFlag) {
      orConditions.push({
        profile: {
          is: {
            isTechnicalManager: true,
          },
        },
      })
    }

    if (options.includeLegacyAdminRole) {
      orConditions.push({
        role: {
          in: ['ADMIN', 'admin'],
        },
      })
    }

    if (options.includeUserIds && options.includeUserIds.length > 0) {
      orConditions.push({
        id: {
          in: options.includeUserIds,
        },
      })
    }

    if (orConditions.length === 0) {
      return []
    }

    const tenantClient = this.prisma.getTenantClient(schemaName)
    const users = await tenantClient.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: orConditions,
      },
      select: { id: true },
    })

    const ids = [...new Set(users.map((u) => u.id))]
    this.recipientsCache.set(cacheKey, {
      expiresAt: now + this.RECIPIENTS_TTL_MS,
      ids,
    })
    return ids
  }

  private async resolveSchemaName(tenantId: string): Promise<string> {
    const now = Date.now()
    const cached = this.schemaCache.get(tenantId)
    if (cached && cached.expiresAt > now) {
      return cached.schemaName
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} não encontrado`)
    }

    this.schemaCache.set(tenantId, {
      expiresAt: now + this.SCHEMA_TTL_MS,
      schemaName: tenant.schemaName,
    })
    return tenant.schemaName
  }

  private buildCacheKey(schemaName: string, options: RecipientQueryOptions): string {
    const positionCodes = (options.positionCodes || []).slice().sort().join(',')
    const includeUserIds = (options.includeUserIds || []).slice().sort().join(',')
    const techFlag = options.includeTechnicalManagerFlag ? '1' : '0'
    const legacyAdmin = options.includeLegacyAdminRole ? '1' : '0'
    return `${schemaName}|${positionCodes}|${techFlag}|${legacyAdmin}|${includeUserIds}`
  }
}

