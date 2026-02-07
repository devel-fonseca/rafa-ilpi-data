import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsNumber,
  MinLength,
} from 'class-validator';
import { DependencyLevel } from '@prisma/client';

// ============================================================================
// CREATE
// ============================================================================

export class CreateResidentDependencyAssessmentDto {
  @ApiProperty({
    description: 'ID do residente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  residentId: string;

  @ApiProperty({
    description: 'Grau de dependência',
    enum: DependencyLevel,
    example: 'GRAU_II',
  })
  @IsEnum(DependencyLevel)
  dependencyLevel: DependencyLevel;

  @ApiProperty({
    description: 'Data de início da avaliação (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsDateString()
  effectiveDate: string;

  @ApiProperty({
    description: 'Instrumento de avaliação utilizado',
    example: 'Escala de Katz',
  })
  @IsString()
  assessmentInstrument: string;

  @ApiPropertyOptional({
    description: 'Pontuação da avaliação',
    example: 4.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  assessmentScore?: number;

  @ApiProperty({
    description: 'Necessita auxílio para mobilidade',
    example: true,
  })
  @IsBoolean()
  mobilityAid: boolean;

  @ApiPropertyOptional({
    description: 'Descrição do auxílio de mobilidade',
    example: 'Cadeira de rodas motorizada',
  })
  @IsOptional()
  @IsString()
  mobilityAidDescription?: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais',
    example: 'Residente apresenta melhora progressiva após fisioterapia',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// UPDATE
// ============================================================================

export class UpdateResidentDependencyAssessmentDto {
  @ApiPropertyOptional({
    description: 'Grau de dependência',
    enum: DependencyLevel,
    example: 'GRAU_II',
  })
  @IsOptional()
  @IsEnum(DependencyLevel)
  dependencyLevel?: DependencyLevel;

  @ApiPropertyOptional({
    description: 'Data de término da avaliação (para encerrar e criar nova)',
    example: '2024-06-15',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Instrumento de avaliação utilizado',
    example: 'Escala de Katz',
  })
  @IsOptional()
  @IsString()
  assessmentInstrument?: string;

  @ApiPropertyOptional({
    description: 'Pontuação da avaliação',
    example: 4.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  assessmentScore?: number;

  @ApiPropertyOptional({
    description: 'Necessita auxílio para mobilidade',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  mobilityAid?: boolean;

  @ApiPropertyOptional({
    description: 'Descrição do auxílio de mobilidade',
    example: 'Cadeira de rodas motorizada',
  })
  @IsOptional()
  @IsString()
  mobilityAidDescription?: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais',
    example: 'Residente apresenta melhora progressiva após fisioterapia',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Motivo da alteração (RDC 502/2021)',
    example: 'Reavaliação após período de reabilitação',
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

export class ResidentDependencyAssessmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  residentId: string;

  @ApiProperty({ enum: DependencyLevel })
  dependencyLevel: DependencyLevel;

  @ApiProperty({ description: 'Data de início da avaliação' })
  effectiveDate: Date;

  @ApiPropertyOptional({ description: 'Data de término (null = vigente)' })
  endDate: Date | null;

  @ApiProperty()
  assessmentInstrument: string;

  @ApiPropertyOptional()
  assessmentScore: number | null;

  @ApiProperty()
  assessedBy: string;

  @ApiProperty()
  mobilityAid: boolean;

  @ApiPropertyOptional()
  mobilityAidDescription: string | null;

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

  @ApiPropertyOptional({
    description: 'Dados do avaliador',
  })
  assessor?: {
    id: string;
    name: string;
    email: string;
  };
}
