import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '../prisma/prisma.module'
import { AsaasService } from './services/asaas.service'
import { InvoiceService } from './services/invoice.service'
import { PaymentService } from './services/payment.service'
import { PaymentAnalyticsService } from './services/payment-analytics.service'
import { WebhooksController } from './webhooks.controller'
import { InvoiceGenerationJob } from './jobs/invoice-generation.job'
import { PaymentSyncJob } from './jobs/payment-sync.job'

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [WebhooksController],
  providers: [
    AsaasService,
    InvoiceService,
    PaymentService,
    PaymentAnalyticsService,
    InvoiceGenerationJob,
    PaymentSyncJob,
  ],
  exports: [AsaasService, InvoiceService, PaymentService, PaymentAnalyticsService],
})
export class PaymentsModule {}
