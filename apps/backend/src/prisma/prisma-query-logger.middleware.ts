import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Middleware Prisma para monitorar queries suspeitas de violação multi-tenant
 *
 * Detecta padrões que indicam possíveis violações:
 * - Queries com WHERE tenantId em TENANT tables (código legado)
 * - Queries cross-schema (JOINs entre public e tenant schemas)
 * - Queries em TENANT tables via public schema
 *
 * ⚠️ Este middleware é para MONITORAMENTO e ALERTAS, não bloqueia execução.
 * Use em conjunto com ESLint rules para prevenir violações.
 *
 * @example
 * ```typescript
 * // Em prisma.service.ts
 * this.$use(async (params, next) => {
 *   const result = await prismaQueryLogger.middleware(params, next);
 *   return result;
 * });
 * ```
 */
@Injectable()
export class PrismaQueryLoggerMiddleware {
  private readonly logger = new Logger('PrismaQueryMonitor');

  /**
   * Tabelas que DEVEM estar em tenant schemas (TENANT tables)
   */
  private readonly TENANT_MODELS = new Set([
    'User',
    'UserProfile',
    'CustomPermission',
    'Resident',
    'ResidentHistory',
    'ResidentHistoryChange',
    'ResidentEmergencyContact',
    'ResidentDocument',
    'ResidentContract',
    'ResidentContractChange',
    'Building',
    'Floor',
    'Room',
    'Bed',
    'BedStatusHistory',
    'ClinicalProfile',
    'ClinicalProfileHistory',
    'ClinicalProfileHistoryChange',
    'ClinicalNote',
    'VitalSign',
    'VitalSignHistory',
    'VitalSignHistoryChange',
    'DailyRecord',
    'Medication',
    'Prescription',
    'PrescriptionMedication',
    'MedicationAdministration',
    'Vaccination',
    'Pop',
    'PopVersion',
    'PopExecution',
    'InstitutionalEvent',
    'InstitutionalEventDocument',
    'Notification',
    'Message',
    'MessageRecipient',
    'Document',
    'DocumentVersion',
    'AuditLog',
    'TenantProfile',
  ]);

  /**
   * Tabelas que DEVEM estar em public schema (SHARED tables)
   */
  private readonly SHARED_MODELS = new Set([
    'Tenant',
    'Plan',
    'Subscription',
    'ServiceContract',
    'ContractAcceptance',
    'EmailTemplate',
    'EmailTemplateVersion',
    'TenantMessage',
    'WebhookEvent',
  ]);

  /**
   * Middleware Prisma
   */
  async middleware(
    params: Prisma.MiddlewareParams,
    next: (params: Prisma.MiddlewareParams) => Promise<unknown>,
  ): Promise<unknown> {
    const startTime = Date.now();

    try {
      // Executar query
      const result = await next(params);

      // Análise pós-execução
      // eslint-disable-next-line no-restricted-syntax -- Calculating query execution time in milliseconds
      const duration = Date.now() - startTime;
      this.analyzeQuery(params, duration);

      return result;
    } catch (error) {
      // Logar erro se relacionado a schema
      if (
        error.message?.includes('schema') ||
        error.message?.includes('relation')
      ) {
        this.logger.error(
          `🚨 Erro possivelmente relacionado a schema isolation:`,
          {
            model: params.model,
            action: params.action,
            error: error.message,
          },
        );
      }
      throw error;
    }
  }

  /**
   * Analisa query em busca de violações arquiteturais
   */
  private analyzeQuery(
    params: Prisma.MiddlewareParams,
    duration: number,
  ): void {
    const { model, action, args } = params;

    // Ignorar queries em tabelas internas do Prisma
    if (!model) return;

    // ALERTA 1: Query com WHERE tenantId em TENANT table
    if (this.TENANT_MODELS.has(model) && args?.where?.tenantId) {
      this.logger.warn(
        `⚠️ [ARQUITETURA] Query com WHERE tenantId em TENANT table "${model}". ` +
          `Isto indica código legado que não foi refatorado para schema isolation.`,
        {
          model,
          action,
          hasWhereClause: true,
          tenantIdInWhere: args.where.tenantId,
          stack: new Error().stack?.split('\n').slice(2, 5).join('\n'), // Stack trace resumido
        },
      );
    }

    // ALERTA 2: Query em TENANT table sem contexto aparente
    if (this.TENANT_MODELS.has(model)) {
      // Queries em tenant tables devem vir de tenant client
      // Se estiver vindo de public client, logar para investigação
      if (duration > 500) {
        // Query lenta pode indicar scan em múltiplos schemas
        this.logger.warn(
          `⚠️ [PERFORMANCE] Query lenta (${duration}ms) em TENANT table "${model}". ` +
            `Pode indicar busca em schema errado ou falta de índice.`,
          {
            model,
            action,
            duration,
          },
        );
      }
    }

    // ALERTA 3: Include/Join suspeito entre SHARED e TENANT tables
    if (args?.include) {
      this.detectCrossSchemaJoin(model, args.include);
    }

    // LOG INFO: Queries em SHARED tables (OK, esperado)
    if (this.SHARED_MODELS.has(model)) {
      this.logger.debug(
        `✅ [PUBLIC] Query em SHARED table "${model}" OK (${duration}ms)`,
      );
    }
  }

  /**
   * Detecta tentativas de JOIN cross-schema via Prisma include
   */
  private detectCrossSchemaJoin(model: string, include: Record<string, unknown>): void {
    const modelIsShared = this.SHARED_MODELS.has(model);
    const _modelIsTenant = this.TENANT_MODELS.has(model);

    for (const relation in include) {
      // Tentar inferir se relation é de schema diferente
      // (heurística: se model é SHARED e include tem relação com nome típico de tenant)
      if (modelIsShared) {
        const suspiciousRelations = [
          'user',
          'creator',
          'updater',
          'resident',
          'bed',
        ];
        if (suspiciousRelations.includes(relation.toLowerCase())) {
          this.logger.error(
            `🚨 [CROSS-SCHEMA] Possível JOIN cross-schema detectado! ` +
              `Model "${model}" (PUBLIC) tentando incluir "${relation}" (provavelmente TENANT). ` +
              `PostgreSQL não suporta JOINs cross-schema via Prisma.`,
            {
              model,
              relation,
              recommendation:
                'Remova o include e faça query separada usando getTenantClient()',
            },
          );
        }
      }

      // Se include for objeto, recursivamente analisar
      const relationInclude = include[relation] as Record<string, unknown> | null | undefined;
      if (typeof relationInclude === 'object' && relationInclude && 'include' in relationInclude) {
        this.detectCrossSchemaJoin(relation, relationInclude.include as Record<string, boolean | object>);
      }
    }
  }

  /**
   * Gera relatório de queries suspeitas (útil para debugging)
   *
   * Execute periodicamente para identificar violações restantes
   */
  generateReport(): {
    tenantModels: number;
    sharedModels: number;
    recommendations: string[];
  } {
    return {
      tenantModels: this.TENANT_MODELS.size,
      sharedModels: this.SHARED_MODELS.size,
      recommendations: [
        '1. Busque por logs "WHERE tenantId em TENANT table" para identificar código legado',
        '2. Busque por logs "CROSS-SCHEMA" para identificar JOINs inválidos',
        '3. Busque por logs "PERFORMANCE" para identificar queries em schema errado',
        '4. Use ESLint rules para prevenir novas violações',
        '5. Consulte docs/architecture/multi-tenancy.md para padrões corretos',
      ],
    };
  }
}
