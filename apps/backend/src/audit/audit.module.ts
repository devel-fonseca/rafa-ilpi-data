import { Module, Global } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditController } from './audit.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor, Reflector],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}