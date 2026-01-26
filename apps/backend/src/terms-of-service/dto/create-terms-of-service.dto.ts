import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTermsOfServiceDto {
  @ApiProperty({
    example: 'v1.0',
    description: 'Versão do termo de uso (ex: v1.0, v1.1, v2.0)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;

  @ApiProperty({
    example: 'Termo de Aceite e Termos de Uso - Plataforma RAFA ILPI',
    description: 'Título do termo de uso',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: '<h1>Termo de Aceite e Termos de Uso</h1><p>...</p>',
    description: 'Conteúdo do termo de uso em HTML ou Markdown',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    example: 'uuid-do-plano',
    description:
      'ID do plano específico (ou null para termo de uso genérico aplicável a todos os planos)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  planId?: string;
}
