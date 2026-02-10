import { api } from '../services/api'

// ==================== TYPES ====================

export interface Allergy {
  id: string
  substance: string
  reaction?: string
  severity?: 'LEVE' | 'MODERADA' | 'GRAVE' | 'ANAFILAXIA'
  notes?: string
}

export interface Resident {
  id: string

  // Dados Pessoais (English names from backend)
  fullName: string
  socialName?: string
  cpf?: string
  rg?: string
  rgIssuer?: string
  education?: string
  profession?: string
  cns?: string
  gender: 'MASCULINO' | 'FEMININO' | 'OUTRO' | 'NAO_INFORMADO'
  civilStatus?: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_ESTAVEL'
  religion?: string
  birthDate: string
  nationality?: string
  birthCity?: string
  birthState?: string
  motherName?: string
  fatherName?: string
  fotoUrl?: string

  // Endereços
  currentCep?: string
  currentState?: string
  currentCity?: string
  currentStreet?: string
  currentNumber?: string
  currentComplement?: string
  currentDistrict?: string
  currentPhone?: string
  originCep?: string
  originState?: string
  originCity?: string
  originStreet?: string
  originNumber?: string
  originComplement?: string
  originDistrict?: string
  originPhone?: string

  // Responsável Legal
  legalGuardianName?: string
  legalGuardianCpf?: string
  legalGuardianRg?: string
  legalGuardianPhone?: string
  legalGuardianEmail?: string
  legalGuardianType?: string
  legalGuardianCep?: string
  legalGuardianState?: string
  legalGuardianCity?: string
  legalGuardianStreet?: string
  legalGuardianNumber?: string
  legalGuardianComplement?: string
  legalGuardianDistrict?: string

  // Admissão
  admissionDate?: string
  admissionType?: string
  admissionReason?: string
  admissionConditions?: string
  dischargeDate?: string
  dischargeReason?: string

  // Saúde (campos evolutivos agora em tabelas separadas)
  healthStatus?: string
  specialNeeds?: string
  functionalAspects?: string
  allergies?: Allergy[]
  chronicConditions?: string
  dietaryRestrictions?: string

  // Acomodação
  roomId?: string
  bedId?: string
  /**
   * Hierarquia nova (bed -> room -> floor -> building)
   * Pode vir expandida em endpoints de listagem/visualização.
   */
  bed?: {
    id?: string
    code?: string
    status?: string
    room?: {
      id?: string
      name?: string
      code?: string
      floor?: {
        id?: string
        name?: string
        code?: string
        building?: {
          id?: string
          name?: string
          code?: string
        }
      }
    }
  }
  /**
   * Fallback legado ainda usado em alguns payloads/telas.
   */
  room?: { id?: string; name?: string; code?: string }
  floor?: { id?: string; name?: string; code?: string }
  building?: { id?: string; name?: string; code?: string }

  // Status e controle
  status: string
  createdAt: string
  updatedAt: string
  deletedAt?: string

  // Arrays adicionais
  emergencyContacts?: Array<{
    name: string
    phone: string
    relationship: string
  }>
  healthPlans?: Array<{
    name: string
    cardNumber: string
    cardUrl?: string
  }>
  // belongings removido - agora gerenciado via /residents/:id/belongings
  documents?: Array<{
    type: string
    url: string
  }>

  // Dados calculados vindos da nova tabela resident_dependency_assessments
  mobilityAid?: boolean
  dependencyLevel?: 'GRAU_I' | 'GRAU_II' | 'GRAU_III' | null
}

export interface ResidentsResponse {
  data: Resident[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ResidentQuery {
  search?: string
  status?: string
  gender?: string
  dependencyLevel?: 'GRAU_I' | 'GRAU_II' | 'GRAU_III'
  dataAdmissaoInicio?: string
  dataAdmissaoFim?: string
  idadeMinima?: string
  idadeMaxima?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ResidentStats {
  total: number
  ativos: number
  inativos: number
  grauI: number
  grauII: number
  grauIII: number
  masculino: number
  feminino: number
}

/**
 * DTO para criar residente
 */
export interface CreateResidentDto {
  fullName: string
  socialName?: string
  cpf?: string
  rg?: string
  rgIssuer?: string
  education?: string
  profession?: string
  cns?: string
  gender: 'MASCULINO' | 'FEMININO' | 'OUTRO' | 'NAO_INFORMADO'
  civilStatus?: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_ESTAVEL'
  religion?: string
  birthDate: string
  nationality?: string
  birthCity?: string
  birthState?: string
  motherName?: string
  fatherName?: string
  fotoUrl?: string
  currentCep?: string
  currentState?: string
  currentCity?: string
  currentStreet?: string
  currentNumber?: string
  currentComplement?: string
  currentDistrict?: string
  currentPhone?: string
  originCep?: string
  originState?: string
  originCity?: string
  originStreet?: string
  originNumber?: string
  originComplement?: string
  originDistrict?: string
  originPhone?: string
  legalGuardianName?: string
  legalGuardianCpf?: string
  legalGuardianRg?: string
  legalGuardianPhone?: string
  legalGuardianEmail?: string
  legalGuardianType?: string
  legalGuardianCep?: string
  legalGuardianState?: string
  legalGuardianCity?: string
  legalGuardianStreet?: string
  legalGuardianNumber?: string
  legalGuardianComplement?: string
  legalGuardianDistrict?: string
  admissionDate?: string
  admissionType?: string
  admissionReason?: string
  admissionConditions?: string
  dischargeDate?: string
  dischargeReason?: string
  healthStatus?: string
  specialNeeds?: string
  functionalAspects?: string
  allergies?: Allergy[]
  chronicConditions?: string
  dietaryRestrictions?: string
  roomId?: string
  bedId?: string
  status: string
  emergencyContacts?: Array<{
    name: string
    phone: string
    relationship: string
  }>
  healthPlans?: Array<{
    name: string
    cardNumber: string
    cardUrl?: string
  }>
  // belongings removido - agora gerenciado via /residents/:id/belongings
  documents?: Array<{
    type: string
    url: string
  }>
}

/**
 * DTO para atualizar residente (todos os campos opcionais + changeReason obrigatório)
 */
export interface UpdateResidentDto {
  fullName?: string
  socialName?: string
  cpf?: string
  rg?: string
  rgIssuer?: string
  education?: string
  profession?: string
  cns?: string
  gender?: 'MASCULINO' | 'FEMININO' | 'OUTRO' | 'NAO_INFORMADO'
  civilStatus?: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_ESTAVEL'
  religion?: string
  birthDate?: string
  nationality?: string
  birthCity?: string
  birthState?: string
  motherName?: string
  fatherName?: string
  fotoUrl?: string
  currentCep?: string
  currentState?: string
  currentCity?: string
  currentStreet?: string
  currentNumber?: string
  currentComplement?: string
  currentDistrict?: string
  currentPhone?: string
  originCep?: string
  originState?: string
  originCity?: string
  originStreet?: string
  originNumber?: string
  originComplement?: string
  originDistrict?: string
  originPhone?: string
  legalGuardianName?: string
  legalGuardianCpf?: string
  legalGuardianRg?: string
  legalGuardianPhone?: string
  legalGuardianEmail?: string
  legalGuardianType?: string
  legalGuardianCep?: string
  legalGuardianState?: string
  legalGuardianCity?: string
  legalGuardianStreet?: string
  legalGuardianNumber?: string
  legalGuardianComplement?: string
  legalGuardianDistrict?: string
  admissionDate?: string
  admissionType?: string
  admissionReason?: string
  admissionConditions?: string
  dischargeDate?: string
  dischargeReason?: string
  healthStatus?: string
  specialNeeds?: string
  functionalAspects?: string
  allergies?: Allergy[]
  chronicConditions?: string
  dietaryRestrictions?: string
  roomId?: string
  bedId?: string
  status?: string
  emergencyContacts?: Array<{
    name: string
    phone: string
    relationship: string
  }>
  healthPlans?: Array<{
    name: string
    cardNumber: string
    cardUrl?: string
  }>
  // belongings removido - agora gerenciado via /residents/:id/belongings
  documents?: Array<{
    type: string
    url: string
  }>
  /**
   * Motivo da alteração (obrigatório - RDC 502/2021 Art. 39)
   */
  changeReason: string
}

/**
 * Entrada de histórico de residente
 */
export interface ResidentHistoryEntry {
  id: string
  tenantId: string
  residentId: string
  versionNumber: number
  changeType: 'CREATE' | 'UPDATE' | 'DELETE'
  changeReason: string
  previousData: Partial<Resident> | null
  newData: Partial<Resident>
  changedFields: string[]
  changedAt: string
  changedBy: string
  changedByName?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Resposta de histórico de residente (estrutura customizada)
 */
export interface ResidentHistoryResponse {
  residentId: string
  resident: {
    fullName: string
    cpf: string | null
    currentVersion: number
  }
  currentVersion: number
  totalVersions: number
  history: Array<{
    id: string
    versionNumber: number
    changeType: 'CREATE' | 'UPDATE' | 'DELETE'
    changeReason: string
    changedFields: string[]
    changedAt: string
    changedBy: {
      id: string
      name: string
      email: string
    }
    previousData?: Partial<Resident>
    newData: Partial<Resident>
  }>
}

// ==================== API CLASS ====================

class ResidentsAPI {
  async getAll(query?: ResidentQuery): Promise<ResidentsResponse> {
    const params = new URLSearchParams()

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }

    const response = await api.get(`/residents?${params.toString()}`)
    return response.data
  }

  async getById(id: string): Promise<Resident> {
    const response = await api.get(`/residents/${id}`)
    return response.data
  }

  async create(data: CreateResidentDto): Promise<Resident> {
    const response = await api.post('/residents', data)
    return response.data
  }

  async update(id: string, data: UpdateResidentDto): Promise<Resident> {
    const response = await api.patch(`/residents/${id}`, data)
    return response.data
  }

  async delete(id: string, deleteReason: string): Promise<{ message: string }> {
    const response = await api.delete(`/residents/${id}`, {
      data: { changeReason: deleteReason }
    })
    return response.data
  }

  async getStats(): Promise<ResidentStats> {
    const response = await api.get('/residents/stats/overview')
    return response.data
  }

  async getHistory(id: string): Promise<ResidentHistoryResponse> {
    const response = await api.get(`/residents/${id}/history`)
    return response.data
  }

  async getHistoryVersion(id: string, versionNumber: number): Promise<ResidentHistoryEntry> {
    const response = await api.get(`/residents/${id}/history/${versionNumber}`)
    return response.data
  }

  async transferBed(residentId: string, toBedId: string, reason: string) {
    const response = await api.post(`/residents/${residentId}/transfer-bed`, {
      toBedId,
      reason,
    })
    return response.data
  }
}

export const residentsAPI = new ResidentsAPI()
