import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { AdminComplianceService } from './admin-compliance.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminComplianceService],
  exports: [AdminComplianceService],
})
export class AdminModule {}
