import { Module } from '@nestjs/common';
import { ResidentHealthController } from './resident-health.controller';
import { ResidentHealthService } from './resident-health.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, PermissionsModule, AuditModule],
  controllers: [ResidentHealthController],
  providers: [ResidentHealthService],
  exports: [ResidentHealthService],
})
export class ResidentHealthModule {}
