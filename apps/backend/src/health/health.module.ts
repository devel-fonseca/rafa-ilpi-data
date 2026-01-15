import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantSchemasHealth } from './tenant-schemas.health';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [TenantSchemasHealth],
})
export class HealthModule {}
