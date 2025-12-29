import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, IsDateString } from 'class-validator';
import { MessageRecipientFilter } from '@prisma/client';

export class CreateTenantMessageDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  htmlContent: string;

  @IsEnum(MessageRecipientFilter)
  recipientFilter: MessageRecipientFilter;

  @IsArray()
  @IsOptional()
  specificTenantIds?: string[];

  @IsDateString()
  @IsOptional()
  scheduledFor?: string; // ISO date string, null = enviar agora
}
