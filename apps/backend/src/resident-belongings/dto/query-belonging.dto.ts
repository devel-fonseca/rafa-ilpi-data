import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BelongingCategory, BelongingStatus } from '@prisma/client';

export class QueryBelongingDto {
  @ApiProperty({
    enum: BelongingCategory,
    required: false,
    description: 'Filtrar por categoria',
    example: 'ELETRONICOS',
  })
  @IsOptional()
  @IsEnum(BelongingCategory)
  category?: BelongingCategory;

  @ApiProperty({
    enum: BelongingStatus,
    required: false,
    description: 'Filtrar por status',
    example: 'EM_GUARDA',
  })
  @IsOptional()
  @IsEnum(BelongingStatus)
  status?: BelongingStatus;

  @ApiProperty({
    required: false,
    description: 'Buscar na descrição ou identificação',
    example: 'celular',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    description: 'Data de entrada inicial (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  entryDateFrom?: string;

  @ApiProperty({
    required: false,
    description: 'Data de entrada final (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  entryDateTo?: string;

  @ApiProperty({
    required: false,
    description: 'Incluir itens excluídos (soft delete)',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeleted?: boolean;

  @ApiProperty({
    required: false,
    description: 'Número da página',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Itens por página',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({
    required: false,
    description: 'Campo para ordenação',
    example: 'entryDate',
    default: 'entryDate',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'entryDate';

  @ApiProperty({
    required: false,
    description: 'Direção da ordenação',
    example: 'desc',
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
