import { Module } from '@nestjs/common';
import { TenantProfileController } from './tenant-profile.controller';
import { TenantProfileService } from './tenant-profile.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TenantProfileController],
  providers: [TenantProfileService],
  exports: [TenantProfileService], // Exportar para uso em outros módulos (ex: guards)
})
export class TenantProfileModule {}
