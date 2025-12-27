import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';

@Module({
  imports: [ConfigModule, EmailTemplatesModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
