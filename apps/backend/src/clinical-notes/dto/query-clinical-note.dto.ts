import { IsOptional, IsEnum, IsDateString, IsArray, IsString, IsInt, Min } from 'class-validator'
import { ClinicalProfession } from '@prisma/client'
import { Type } from 'class-transformer'

/**
 * DTO para queries e filtros de evoluções clínicas
 *
 * Suporta filtros por:
 * - Profissão (profession)
 * - Período (startDate, endDate)
 * - Tags (array de tags)
 * - Paginação (page, limit)
 */
export class QueryClinicalNoteDto {
  // Filtro por profissão
  @IsOptional()
  @IsEnum(ClinicalProfession)
  profession?: ClinicalProfession

  // Filtro por período
  @IsOptional()
  @IsDateString()
  startDate?: string // ISO 8601

  @IsOptional()
  @IsDateString()
  endDate?: string // ISO 8601

  // Filtro por tags (array de strings)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  // Paginação
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number
}
