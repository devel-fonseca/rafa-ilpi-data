import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateContractDto {
  @ApiProperty({
    example: 'Contrato de Prestação de Serviços - Plano Básico (Atualizado)',
    description: 'Título do contrato',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    example: '<h1>Contrato de Prestação de Serviços</h1><p>...</p>',
    description: 'Conteúdo do contrato em HTML ou Markdown',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;
}
