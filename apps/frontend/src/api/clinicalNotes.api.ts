import { api } from '@/services/api'

// ==================== TYPES ====================

export type ClinicalProfession =
  | 'MEDICINE'
  | 'NURSING'
  | 'NUTRITION'
  | 'PHYSIOTHERAPY'
  | 'PSYCHOLOGY'
  | 'SOCIAL_WORK'
  | 'SPEECH_THERAPY'
  | 'OCCUPATIONAL_THERAPY'

export interface ClinicalNote {
  id: string
  tenantId: string
  residentId: string
  professionalId: string
  profession: ClinicalProfession
  noteDate: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string | null
  version: number
  isAmended: boolean
  editableUntil: string
  professional: {
    id: string
    name: string
    email: string
  }
  resident: {
    id: string
    fullName: string
    cpf: string
  }
}

export interface ClinicalNoteHistory {
  id: string
  noteId: string
  version: number
  tenantId: string
  residentId: string
  professionalId: string
  profession: ClinicalProfession
  noteDate: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  tags: string[]
  changeReason: string
  changedAt: string
  changedBy: string
  professional: {
    id: string
    name: string
    email: string
  }
  changedByUser: {
    id: string
    name: string
    email: string
  }
}

export interface CreateClinicalNoteDto {
  residentId: string
  profession: ClinicalProfession
  noteDate?: string
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
  tags?: string[]
}

export interface UpdateClinicalNoteDto {
  editReason: string
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
  tags?: string[]
}

export interface QueryClinicalNoteDto {
  profession?: ClinicalProfession
  startDate?: string
  endDate?: string
  tags?: string[]
  page?: number
  limit?: number
}

export interface DeleteClinicalNoteDto {
  deleteReason: string
}

export interface ClinicalNoteHistoryResponse {
  currentVersion: number
  isAmended: boolean
  history: ClinicalNoteHistory[]
}

// ==================== API FUNCTIONS ====================

/**
 * Cria uma nova evolução clínica (SOAP)
 */
export async function createClinicalNote(data: CreateClinicalNoteDto): Promise<ClinicalNote> {
  const response = await api.post('/clinical-notes', data)
  return response.data
}

/**
 * Lista evoluções clínicas com filtros e paginação
 */
export async function listClinicalNotes(query?: QueryClinicalNoteDto): Promise<ClinicalNote[]> {
  const params = new URLSearchParams()

  if (query?.profession) params.append('profession', query.profession)
  if (query?.startDate) params.append('startDate', query.startDate)
  if (query?.endDate) params.append('endDate', query.endDate)
  if (query?.tags && query.tags.length > 0) {
    query.tags.forEach(tag => params.append('tags', tag))
  }
  if (query?.page) params.append('page', query.page.toString())
  if (query?.limit) params.append('limit', query.limit.toString())

  const response = await api.get(`/clinical-notes?${params.toString()}`)
  return response.data
}

/**
 * Lista evoluções clínicas de um residente específico
 */
export async function listClinicalNotesByResident(
  residentId: string,
  query?: QueryClinicalNoteDto
): Promise<ClinicalNote[]> {
  const params = new URLSearchParams()

  if (query?.profession) params.append('profession', query.profession)
  if (query?.startDate) params.append('startDate', query.startDate)
  if (query?.endDate) params.append('endDate', query.endDate)
  if (query?.tags && query.tags.length > 0) {
    query.tags.forEach(tag => params.append('tags', tag))
  }
  if (query?.page) params.append('page', query.page.toString())
  if (query?.limit) params.append('limit', query.limit.toString())

  const queryString = params.toString()
  const url = queryString
    ? `/clinical-notes/resident/${residentId}?${queryString}`
    : `/clinical-notes/resident/${residentId}`

  const response = await api.get(url)
  // Backend retorna { data: ClinicalNote[], total: number }
  return response.data.data || []
}

/**
 * Busca uma evolução clínica por ID
 */
export async function getClinicalNote(id: string): Promise<ClinicalNote> {
  const response = await api.get(`/clinical-notes/${id}`)
  return response.data
}

/**
 * Busca o histórico de versões de uma evolução clínica
 */
export async function getClinicalNoteHistory(id: string): Promise<ClinicalNoteHistoryResponse> {
  const response = await api.get(`/clinical-notes/${id}/history`)
  return response.data
}

/**
 * Atualiza uma evolução clínica (com versionamento)
 */
export async function updateClinicalNote(
  id: string,
  data: UpdateClinicalNoteDto
): Promise<ClinicalNote> {
  const response = await api.patch(`/clinical-notes/${id}`, data)
  return response.data
}

/**
 * Soft delete de uma evolução clínica
 */
export async function deleteClinicalNote(id: string, data: DeleteClinicalNoteDto): Promise<void> {
  await api.delete(`/clinical-notes/${id}`, { data })
}

/**
 * Busca sugestões de tags (para autocomplete)
 */
export async function getClinicalNoteTags(): Promise<string[]> {
  const response = await api.get('/clinical-notes/tags/suggestions')
  return response.data
}
