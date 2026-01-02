import { PaginationDto, PaginatedResponse, PaginationMeta } from '../dto/pagination.dto'

/**
 * Helper para paginação com Prisma
 *
 * Padrão Asaas: offset-based pagination
 * @see https://docs.asaas.com/reference/listagem-e-paginacao
 */
export class PaginationHelper {
  /**
   * Converte PaginationDto em parâmetros Prisma
   *
   * @param pagination - DTO com offset e limit
   * @returns Objeto com skip e take para Prisma
   *
   * @example
   * ```typescript
   * const params = PaginationHelper.toPrismaParams({ offset: 0, limit: 10 })
   * // { skip: 0, take: 10 }
   * ```
   */
  static toPrismaParams(pagination: PaginationDto): { skip: number; take: number } {
    return {
      skip: pagination.offset ?? 0,
      take: pagination.limit ?? 10,
    }
  }

  /**
   * Cria resposta paginada com metadata
   *
   * @param data - Array de dados
   * @param total - Total de registros no banco
   * @param pagination - DTO com offset e limit
   * @returns Resposta paginada com data e meta
   *
   * @example
   * ```typescript
   * const residents = await prisma.resident.findMany({ skip: 0, take: 10 })
   * const total = await prisma.resident.count()
   * const response = PaginationHelper.paginate(residents, total, { offset: 0, limit: 10 })
   * ```
   */
  static paginate<T>(
    data: T[],
    total: number,
    pagination: PaginationDto,
  ): PaginatedResponse<T> {
    const offset = pagination.offset ?? 0
    const limit = pagination.limit ?? 10

    return {
      data,
      meta: {
        total,
        offset,
        limit,
        hasMore: offset + limit < total,
      },
    }
  }

  /**
   * Executa query paginada com count automático
   *
   * @param findMany - Função findMany do Prisma
   * @param countFn - Função count do Prisma
   * @param pagination - DTO com offset e limit
   * @returns Resposta paginada
   *
   * @example
   * ```typescript
   * const response = await PaginationHelper.execute(
   *   async (params) => prisma.resident.findMany({ where: { tenantId }, ...params }),
   *   async (where) => prisma.resident.count({ where }),
   *   { offset: 0, limit: 10 }
   * )
   * ```
   */
  static async execute<T>(
    findMany: (params: { skip: number; take: number }) => Promise<T[]>,
    countFn: () => Promise<number>,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<T>> {
    const params = this.toPrismaParams(pagination)

    // Executar queries em paralelo
    const [data, total] = await Promise.all([
      findMany(params),
      countFn(),
    ])

    return this.paginate(data, total, pagination)
  }

  /**
   * Valida se offset está dentro do range válido
   *
   * @param offset - Offset a validar
   * @param total - Total de registros
   * @returns true se offset é válido
   */
  static isValidOffset(offset: number, total: number): boolean {
    return offset >= 0 && offset < total
  }

  /**
   * Calcula offset da última página
   *
   * @param total - Total de registros
   * @param limit - Itens por página
   * @returns Offset da última página
   */
  static getLastPageOffset(total: number, limit: number): number {
    if (total === 0) return 0
    return Math.floor((total - 1) / limit) * limit
  }
}
