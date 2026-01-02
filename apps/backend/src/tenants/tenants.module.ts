import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantCacheService } from './tenant-cache.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { PrivacyPolicyModule } from '../privacy-policy/privacy-policy.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    PrivacyPolicyModule,
    PaymentsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-key',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [TenantsController],
  providers: [TenantsService, TenantCacheService],
  exports: [TenantsService, TenantCacheService],
})
export class TenantsModule {}