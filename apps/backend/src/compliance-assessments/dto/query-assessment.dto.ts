import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

/**
 * Status possíveis de um assessment
 */
export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Nível de conformidade
 */
export enum ComplianceLevel {
  REGULAR = 'REGULAR', // ≥75%
  PARCIAL = 'PARCIAL', // 50-74%
  IRREGULAR = 'IRREGULAR', // <50%
}

/**
 * DTO para filtros e paginação de assessments
 */
export class QueryAssessmentDto {
  @ApiPropertyOptional({
    description: 'Filtrar por status',
    enum: AssessmentStatus,
    example: AssessmentStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por nível de conformidade',
    enum: ComplianceLevel,
    example: ComplianceLevel.REGULAR,
  })
  @IsOptional()
  @IsEnum(ComplianceLevel)
  complianceLevel?: ComplianceLevel;

  @ApiPropertyOptional({
    description: 'Filtrar por versão da regulamentação',
    example: '5df5316e-9bb7-4e9f-8c41-71c9bc324c86',
  })
  @IsOptional()
  @IsUUID()
  versionId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por data inicial (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por data final (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por usuário que realizou',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  performedBy?: string;

  @ApiPropertyOptional({
    description: 'Página (começando em 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Itens por página',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
