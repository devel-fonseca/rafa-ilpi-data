import { Module } from '@nestjs/common';
import { AllergiesService } from './allergies.service';
import { AllergiesController } from './allergies.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, PermissionsModule, AuthModule],
  controllers: [AllergiesController],
  providers: [AllergiesService],
  exports: [AllergiesService],
})
export class AllergiesModule {}
