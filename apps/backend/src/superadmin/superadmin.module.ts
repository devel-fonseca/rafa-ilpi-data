import { Module, forwardRef } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { PaymentsModule } from '../payments/payments.module'
// import { ContractsModule } from '../contracts/contracts.module' // DEPRECATED: Use TermsOfServiceModule
import { TermsOfServiceModule } from '../terms-of-service/terms-of-service.module'
import { TenantsModule } from '../tenants/tenants.module'
import { EmailModule } from '../email/email.module'
import { MetricsService } from './services/metrics.service'
import { TenantAdminService } from './services/tenant-admin.service'
import { SubscriptionAdminService } from './services/subscription-admin.service'
import { PlansAdminService } from './services/plans-admin.service'
import { AlertsService } from './services/alerts.service'
import { CollectionsService } from './services/collections.service'
import { BackupAdminService } from './services/backup-admin.service'
import { SubscriptionAlertsJob } from './jobs/subscription-alerts.job'
import { PaymentAlertsJob } from './jobs/payment-alerts.job'
import { OverdueReportsJob } from './jobs/overdue-reports.job'
import { TrialExpirationAlertsJob } from './jobs/trial-expiration-alerts.job'
import { TrialToActiveConversionJob } from './jobs/trial-to-active-conversion.job'
import { TenantStatsRefreshJob } from './jobs/tenant-stats-refresh.job'
import { SuperAdminController } from './superadmin.controller'

/**
 * SuperAdminModule
 *
 * Módulo responsável por todas as funcionalidades do portal do Super Administrador.
 *
 * Estrutura:
 * - Controllers: Rotas protegidas por SuperAdminGuard
 * - Services:
 *   - MetricsService: Cálculos de MRR, ARR, Churn, LTV
 *   - TenantAdminService: Gestão de tenants
 *   - SubscriptionAdminService: Gestão de subscriptions
 *
 * Fases de implementação:
 * - Fase 1 (Atual): Estrutura base com placeholders
 * - Fase 2: Dashboard com métricas
 * - Fase 3: CRUD de tenants e subscriptions
 * - Fase 4: Integração com Asaas (pagamentos)
 * - Fase 5: Sistema de alertas
 */
@Module({
  imports: [
    PrismaModule,
    // forwardRef() evita dependência circular com PaymentsModule e TenantsModule
    forwardRef(() => PaymentsModule),
    forwardRef(() => TenantsModule),
    // ContractsModule, // DEPRECATED: Removido em favor de TermsOfServiceModule
    TermsOfServiceModule,
    EmailModule,
  ],
  controllers: [SuperAdminController],
  providers: [
    MetricsService,
    TenantAdminService,
    SubscriptionAdminService,
    PlansAdminService,
    AlertsService,
    CollectionsService,
    BackupAdminService,
    SubscriptionAlertsJob,
    PaymentAlertsJob,
    OverdueReportsJob,
    TrialExpirationAlertsJob,
    TrialToActiveConversionJob,
    TenantStatsRefreshJob,
  ],
  exports: [MetricsService, TenantAdminService, SubscriptionAdminService, PlansAdminService, AlertsService, CollectionsService, BackupAdminService],
})
export class SuperAdminModule {}
