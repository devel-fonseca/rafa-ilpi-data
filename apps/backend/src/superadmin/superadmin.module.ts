import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { PaymentsModule } from '../payments/payments.module'
import { MetricsService } from './services/metrics.service'
import { TenantAdminService } from './services/tenant-admin.service'
import { SubscriptionAdminService } from './services/subscription-admin.service'
import { PlansAdminService } from './services/plans-admin.service'
import { AlertsService } from './services/alerts.service'
import { SubscriptionAlertsJob } from './jobs/subscription-alerts.job'
import { PaymentAlertsJob } from './jobs/payment-alerts.job'
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
  imports: [PrismaModule, PaymentsModule],
  controllers: [SuperAdminController],
  providers: [
    MetricsService,
    TenantAdminService,
    SubscriptionAdminService,
    PlansAdminService,
    AlertsService,
    SubscriptionAlertsJob,
    PaymentAlertsJob,
  ],
  exports: [MetricsService, TenantAdminService, SubscriptionAdminService, PlansAdminService, AlertsService],
})
export class SuperAdminModule {}
