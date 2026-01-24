import { Module } from '@nestjs/common';
import { ComplianceAssessmentsController } from './compliance-assessments.controller';
import { ComplianceAssessmentsService } from './compliance-assessments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [ComplianceAssessmentsController],
  providers: [ComplianceAssessmentsService],
  exports: [ComplianceAssessmentsService],
})
export class ComplianceAssessmentsModule {}
