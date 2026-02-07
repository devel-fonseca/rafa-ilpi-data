import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  Max,
  MinLength,
} from 'class-validator';

// ============================================================================
// CREATE
// ============================================================================

export class CreateResidentAnthropometryDto {
  @ApiProperty({
    description: 'ID do residente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  residentId: string;

  @ApiPropertyOptional({
    description: 'Altura em metros (opcional - pode ser informada apenas o peso)',
    example: 1.75,
    minimum: 0.5,
    maximum: 2.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(2.5)
  height?: number;

  @ApiProperty({
    description: 'Peso em kg',
    example: 70.5,
    minimum: 20,
    maximum: 300,
  })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(300)
  weight: number;

  @ApiProperty({
    description: 'Data da medição (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsDateString()
  measurementDate: string;

  @ApiPropertyOptional({
    description: 'Observações sobre a medição',
    example: 'Medição realizada em jejum',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// UPDATE
// ============================================================================

export class UpdateResidentAnthropometryDto {
  @ApiPropertyOptional({
    description: 'Altura em metros',
    example: 1.75,
    minimum: 0.5,
    maximum: 2.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(2.5)
  height?: number;

  @ApiPropertyOptional({
    description: 'Peso em kg',
    example: 70.5,
    minimum: 20,
    maximum: 300,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(300)
  weight?: number;

  @ApiPropertyOptional({
    description: 'Data da medição (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  measurementDate?: string;

  @ApiPropertyOptional({
    description: 'Observações sobre a medição',
    example: 'Medição realizada em jejum',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Motivo da alteração (RDC 502/2021)',
    example: 'Correção de erro de digitação na medição',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, {
    message: 'O motivo da alteração deve ter no mínimo 10 caracteres',
  })
  changeReason: string;
}

// ============================================================================
// RESPONSE
// ============================================================================

export class ResidentAnthropometryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  residentId: string;

  @ApiProperty({ description: 'Altura em metros' })
  height: number;

  @ApiProperty({ description: 'Peso em kg' })
  weight: number;

  @ApiProperty({ description: 'IMC calculado' })
  bmi: number;

  @ApiProperty({ description: 'Data da medição' })
  measurementDate: Date;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiProperty()
  versionNumber: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  createdBy: string;

  @ApiPropertyOptional()
  updatedBy: string | null;
}
