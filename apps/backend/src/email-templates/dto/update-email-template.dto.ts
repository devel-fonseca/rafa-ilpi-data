import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsUUID } from 'class-validator';
import { CreateEmailTemplateDto } from './create-email-template.dto';

export class UpdateEmailTemplateDto extends PartialType(CreateEmailTemplateDto) {
  @IsString()
  @IsOptional()
  changeNote?: string; // Para versionamento

  @IsUUID()
  @IsOptional()
  userId?: string; // ID do superadmin que fez a mudança
}
