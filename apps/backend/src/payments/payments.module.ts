import { Module, forwardRef } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '../prisma/prisma.module'
import { SuperAdminModule } from '../superadmin/superadmin.module'
import { AsaasService } from './services/asaas.service'
import { InvoiceService } from './services/invoice.service'
import { PaymentService } from './services/payment.service'
import { PaymentAnalyticsService } from './services/payment-analytics.service'
import { WebhooksController } from './webhooks.controller'
import { InvoiceGenerationJob } from './jobs/invoice-generation.job'
import { PaymentSyncJob } from './jobs/payment-sync.job'
import { AsaasSyncJob } from './jobs/asaas-sync.job'

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    // Import SuperAdminModule para acessar AlertsService nos jobs
    // forwardRef() evita dependência circular (SuperAdminModule já importa PaymentsModule)
    forwardRef(() => SuperAdminModule),
  ],
  controllers: [WebhooksController],
  providers: [
    AsaasService,
    InvoiceService,
    PaymentService,
    PaymentAnalyticsService,
    InvoiceGenerationJob,
    PaymentSyncJob,
    AsaasSyncJob,
  ],
  exports: [AsaasService, InvoiceService, PaymentService, PaymentAnalyticsService, AsaasSyncJob],
})
export class PaymentsModule {}
