import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString, IsIn } from 'class-validator';

export class QueryDailyRecordDto {
  @ApiProperty({
    required: false,
    description: 'Filtrar por ID do residente',
  })
  @IsOptional()
  @IsString()
  residentId?: string;

  @ApiProperty({
    enum: [
      'HIGIENE',
      'ALIMENTACAO',
      'HIDRATACAO',
      'MONITORAMENTO',
      'ELIMINACAO',
      'COMPORTAMENTO',
      'INTERCORRENCIA',
      'ATIVIDADES',
      'VISITA',
      'OUTROS',
    ],
    required: false,
    description: 'Filtrar por tipo de registro',
  })
  @IsOptional()
  @IsEnum([
    'HIGIENE',
    'ALIMENTACAO',
    'HIDRATACAO',
    'MONITORAMENTO',
    'ELIMINACAO',
    'COMPORTAMENTO',
    'INTERCORRENCIA',
    'ATIVIDADES',
    'VISITA',
    'OUTROS',
  ])
  type?: string;

  @ApiProperty({
    required: false,
    description: 'Filtrar por data específica (YYYY-MM-DD)',
    example: '2025-11-15',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    required: false,
    description: 'Data inicial do período (YYYY-MM-DD)',
    example: '2025-11-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    required: false,
    description: 'Data final do período (YYYY-MM-DD)',
    example: '2025-11-30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    required: false,
    default: '1',
    description: 'Número da página',
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({
    required: false,
    default: '50',
    description: 'Quantidade de itens por página',
  })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiProperty({
    required: false,
    default: 'date',
    description: 'Campo para ordenação',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    required: false,
    default: 'desc',
    enum: ['asc', 'desc'],
    description: 'Ordem de classificação',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
