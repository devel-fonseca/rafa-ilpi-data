import { Injectable, Scope } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from './prisma.service'

/**
 * Service com scope REQUEST para injetar automaticamente o tenant client correto.
 *
 * Este service é criado uma vez por request HTTP e mantém o estado do tenant
 * durante toda a execução da request.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class BedsService {
 *   constructor(
 *     private prisma: PrismaService, // Para tabelas SHARED (public)
 *     private tenantContext: TenantContextService // Para tabelas TENANT-SPECIFIC
 *   ) {}
 *
 *   async findAll() {
 *     // ✅ Acessa automaticamente o schema correto do tenant
 *     return this.tenantContext.client.bed.findMany({
 *       where: { deletedAt: null } // ✅ Sem filtro tenantId!
 *     });
 *   }
 * }
 * ```
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private _tenantClient: PrismaClient | null = null
  private _tenantId: string | null = null

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inicializa o contexto do tenant para a request atual.
   *
   * Este método é chamado automaticamente pelo TenantContextInterceptor
   * no início de cada request autenticada.
   *
   * @param tenantId - UUID do tenant extraído do JWT
   * @throws Error se o tenant não for encontrado
   */
  async initialize(tenantId: string): Promise<void> {
    if (this._tenantClient) return // Já inicializado

    this._tenantId = tenantId

    // Buscar schema name do tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    })

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} não encontrado`)
    }

    // Obter client do tenant (PrismaService mantém cache de clients)
    this._tenantClient = this.prisma.getTenantClient(tenant.schemaName)
  }

  /**
   * Retorna o Prisma Client configurado para o schema do tenant atual.
   *
   * Use este client para acessar tabelas TENANT-SPECIFIC (residents, beds, users, etc.)
   *
   * @throws Error se o contexto não foi inicializado
   *
   * @example
   * ```typescript
   * const beds = await this.tenantContext.client.bed.findMany();
   * ```
   */
  get client(): PrismaClient {
    if (!this._tenantClient) {
      throw new Error(
        'TenantContext não foi inicializado. ' +
          'Certifique-se de que o usuário está autenticado e o interceptor está configurado.',
      )
    }
    return this._tenantClient
  }

  /**
   * Retorna o UUID do tenant atual.
   *
   * Útil quando você precisa do ID do tenant para logs, auditoria, ou queries em tabelas SHARED.
   *
   * @throws Error se o contexto não foi inicializado
   *
   * @example
   * ```typescript
   * const tenantId = this.tenantContext.tenantId;
   * await this.prisma.tenant.findUnique({ where: { id: tenantId } });
   * ```
   */
  get tenantId(): string {
    if (!this._tenantId) {
      throw new Error('TenantContext não foi inicializado.')
    }
    return this._tenantId
  }

  /**
   * Retorna o Prisma Client principal (schema public).
   *
   * Use este client para acessar tabelas SHARED que ficam no schema public:
   * - tenants
   * - plans
   * - subscriptions
   * - invoices
   * - payments
   * - usage_metrics
   * - webhook_events
   * - email_templates
   * - email_template_versions
   * - tenant_messages
   *
   * @example
   * ```typescript
   * const tenant = await this.tenantContext.publicClient.tenant.findUnique({
   *   where: { id: this.tenantContext.tenantId }
   * });
   * ```
   */
  get publicClient(): PrismaClient {
    return this.prisma
  }
}
