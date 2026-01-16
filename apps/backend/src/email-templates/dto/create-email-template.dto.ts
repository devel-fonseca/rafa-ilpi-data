import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmailTemplateCategory } from '@prisma/client';

class TemplateVariableDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string; // 'string' | 'number' | 'date' | 'boolean'

  @IsBoolean()
  required: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateEmailTemplateDto {
  @IsString()
  @IsNotEmpty()
  key: string; // "user-invite", "payment-reminder", etc.

  @IsString()
  @IsNotEmpty()
  name: string; // "Convite de Usuário"

  @IsString()
  @IsNotEmpty()
  subject: string; // "Acesso liberado ao sistema da {{tenantName}}"

  @IsString()
  @IsOptional()
  description?: string;

  @IsNotEmpty()
  jsonContent: Record<string, unknown>; // Easy Email JSON structure

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables: TemplateVariableDto[];

  @IsEnum(EmailTemplateCategory)
  category: EmailTemplateCategory;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
