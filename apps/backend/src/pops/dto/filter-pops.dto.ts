import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator'
import { Transform } from 'class-transformer'
import { PopStatus, PopCategory } from '@prisma/client'

/**
 * DTO para filtros de listagem de POPs
 */
export class FilterPopsDto {
  @IsOptional()
  @IsEnum(PopStatus, { message: 'Status inválido' })
  status?: PopStatus

  @IsOptional()
  @IsEnum(PopCategory, { message: 'Categoria inválida' })
  category?: PopCategory

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'requiresReview deve ser um boolean' })
  requiresReview?: boolean

  @IsOptional()
  @IsString()
  templateId?: string

  @IsOptional()
  @IsString()
  search?: string // Busca por título
}
