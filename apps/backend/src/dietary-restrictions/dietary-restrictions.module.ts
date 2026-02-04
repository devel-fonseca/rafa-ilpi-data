import { Module } from '@nestjs/common';
import { DietaryRestrictionsService } from './dietary-restrictions.service';
import { DietaryRestrictionsController } from './dietary-restrictions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, PermissionsModule, AuthModule],
  controllers: [DietaryRestrictionsController],
  providers: [DietaryRestrictionsService],
  exports: [DietaryRestrictionsService],
})
export class DietaryRestrictionsModule {}
