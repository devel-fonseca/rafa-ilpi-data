import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateContractDto {
  @ApiProperty({
    example: 'v1.0',
    description: 'Versão do contrato (ex: v1.0, v1.1, v2.0)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;

  @ApiProperty({
    example: 'Contrato de Prestação de Serviços - Plano Básico',
    description: 'Título do contrato',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: '<h1>Contrato de Prestação de Serviços</h1><p>...</p>',
    description: 'Conteúdo do contrato em HTML ou Markdown',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    example: 'uuid-do-plano',
    description:
      'ID do plano específico (ou null para contrato genérico aplicável a todos os planos)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  planId?: string;
}
