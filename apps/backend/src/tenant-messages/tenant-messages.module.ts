import { Module } from '@nestjs/common';
import { TenantMessagesController } from './tenant-messages.controller';
import { TenantMessagesService } from './tenant-messages.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [TenantMessagesController],
  providers: [TenantMessagesService],
  exports: [TenantMessagesService],
})
export class TenantMessagesModule {}
