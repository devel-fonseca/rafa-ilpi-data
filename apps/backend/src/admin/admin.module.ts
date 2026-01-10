import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { PlansModule } from '../plans/plans.module'
import { PaymentsModule } from '../payments/payments.module'
import { ContractsModule } from '../contracts/contracts.module'
import { SuperAdminModule } from '../superadmin/superadmin.module'

@Module({
  imports: [
    PrismaModule,
    PlansModule,
    PaymentsModule,
    ContractsModule,
    SuperAdminModule,
  ],
  controllers: [AdminController],
  providers: [],
  exports: [],
})
export class AdminModule {}
