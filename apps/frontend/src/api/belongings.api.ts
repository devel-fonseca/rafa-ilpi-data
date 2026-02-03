import { api } from '@/services/api'
import type {
  ResidentBelonging,
  BelongingTerm,
  BelongingHistory,
  CreateBelongingDto,
  UpdateBelongingDto,
  ChangeStatusDto,
  QueryBelongingDto,
  CreateTermDto,
  PaginatedBelongingsResponse,
  BelongingStats,
  TermPrintData,
  BelongingTermType,
  BelongingTermStatus,
} from '@/types/belongings'

// ─────────────────────────────────────────────────────────────────────────────
//  PERTENCES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lista pertences de um residente com filtros e paginação
 */
export async function listBelongings(
  residentId: string,
  query?: QueryBelongingDto,
): Promise<PaginatedBelongingsResponse> {
  const params = new URLSearchParams()

  if (query?.category) params.append('category', query.category)
  if (query?.status) params.append('status', query.status)
  if (query?.search) params.append('search', query.search)
  if (query?.entryDateFrom) params.append('entryDateFrom', query.entryDateFrom)
  if (query?.entryDateTo) params.append('entryDateTo', query.entryDateTo)
  if (query?.includeDeleted) params.append('includeDeleted', 'true')
  if (query?.page) params.append('page', String(query.page))
  if (query?.limit) params.append('limit', String(query.limit))
  if (query?.sortBy) params.append('sortBy', query.sortBy)
  if (query?.sortOrder) params.append('sortOrder', query.sortOrder)

  const queryString = params.toString()
  const url = `/residents/${residentId}/belongings${queryString ? `?${queryString}` : ''}`

  const response = await api.get(url)
  return response.data
}

/**
 * Busca estatísticas de pertences de um residente
 */
export async function getBelongingStats(residentId: string): Promise<BelongingStats> {
  const response = await api.get(`/residents/${residentId}/belongings/stats`)
  return response.data
}

/**
 * Busca um pertence por ID
 */
export async function getBelonging(
  residentId: string,
  belongingId: string,
): Promise<ResidentBelonging> {
  const response = await api.get(`/residents/${residentId}/belongings/${belongingId}`)
  return response.data
}

/**
 * Cria novo pertence
 */
export async function createBelonging(
  residentId: string,
  dto: CreateBelongingDto,
): Promise<ResidentBelonging> {
  const response = await api.post(`/residents/${residentId}/belongings`, dto)
  return response.data
}

/**
 * Atualiza um pertence
 */
export async function updateBelonging(
  residentId: string,
  belongingId: string,
  dto: UpdateBelongingDto,
): Promise<ResidentBelonging> {
  const response = await api.patch(`/residents/${residentId}/belongings/${belongingId}`, dto)
  return response.data
}

/**
 * Altera status de um pertence (DEVOLVIDO, EXTRAVIADO, DESCARTADO)
 */
export async function changeBelongingStatus(
  residentId: string,
  belongingId: string,
  dto: ChangeStatusDto,
): Promise<ResidentBelonging> {
  const response = await api.patch(
    `/residents/${residentId}/belongings/${belongingId}/status`,
    dto,
  )
  return response.data
}

/**
 * Upload de foto de um pertence
 */
export async function uploadBelongingPhoto(
  residentId: string,
  belongingId: string,
  file: File,
): Promise<ResidentBelonging> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post(
    `/residents/${residentId}/belongings/${belongingId}/photo`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )
  return response.data
}

/**
 * Deleta um pertence (soft delete)
 */
export async function deleteBelonging(
  residentId: string,
  belongingId: string,
): Promise<{ message: string }> {
  const response = await api.delete(`/residents/${residentId}/belongings/${belongingId}`)
  return response.data
}

/**
 * Busca histórico de alterações de um pertence
 */
export async function getBelongingHistory(
  residentId: string,
  belongingId: string,
): Promise<BelongingHistory[]> {
  const response = await api.get(`/residents/${residentId}/belongings/${belongingId}/history`)
  return response.data
}

// ─────────────────────────────────────────────────────────────────────────────
//  TERMOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lista termos de pertences de um residente
 */
export async function listTerms(
  residentId: string,
  filters?: {
    type?: BelongingTermType
    status?: BelongingTermStatus
  },
): Promise<BelongingTerm[]> {
  const params = new URLSearchParams()

  if (filters?.type) params.append('type', filters.type)
  if (filters?.status) params.append('status', filters.status)

  const queryString = params.toString()
  const url = `/residents/${residentId}/belonging-terms${queryString ? `?${queryString}` : ''}`

  const response = await api.get(url)
  return response.data
}

/**
 * Busca um termo por ID
 */
export async function getTerm(residentId: string, termId: string): Promise<BelongingTerm> {
  const response = await api.get(`/residents/${residentId}/belonging-terms/${termId}`)
  return response.data
}

/**
 * Gera novo termo de pertences
 */
export async function generateTerm(
  residentId: string,
  dto: CreateTermDto,
): Promise<BelongingTerm> {
  const response = await api.post(`/residents/${residentId}/belonging-terms/generate`, dto)
  return response.data
}

/**
 * Upload de termo assinado
 */
export async function uploadSignedTerm(
  residentId: string,
  termId: string,
  file: File,
): Promise<BelongingTerm> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post(
    `/residents/${residentId}/belonging-terms/${termId}/upload-signed`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )
  return response.data
}

/**
 * Cancela um termo não assinado
 */
export async function cancelTerm(
  residentId: string,
  termId: string,
  reason: string,
): Promise<BelongingTerm> {
  const response = await api.post(`/residents/${residentId}/belonging-terms/${termId}/cancel`, {
    reason,
  })
  return response.data
}

/**
 * Busca dados para impressão/PDF de um termo
 */
export async function getTermPrintData(
  residentId: string,
  termId: string,
): Promise<TermPrintData> {
  const response = await api.get(`/residents/${residentId}/belonging-terms/${termId}/print`)
  return response.data
}
