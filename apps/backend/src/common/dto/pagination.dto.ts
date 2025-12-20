import { IsOptional, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

/**
 * DTO padrão para paginação
 * Segue especificação do Asaas: offset, limit, totalCount, hasMore
 * @see https://docs.asaas.com/reference/listagem-e-paginacao
 */
export class PaginationDto {
  @ApiProperty({
    description: 'Posição inicial (0-indexed)',
    example: 0,
    default: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0

  @ApiProperty({
    description: 'Quantidade de itens por página (1-100)',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10
}

/**
 * Metadata de resposta paginada
 */
export interface PaginationMeta {
  total: number // Total de registros (totalCount)
  offset: number // Posição inicial
  limit: number // Itens por página
  hasMore: boolean // Indica se há mais páginas
}

/**
 * Resposta paginada genérica
 */
export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

/**
 * Helper para criar metadata de paginação
 */
export function createPaginationMeta(
  total: number,
  offset: number,
  limit: number,
): PaginationMeta {
  return {
    total,
    offset,
    limit,
    hasMore: offset + limit < total,
  }
}
