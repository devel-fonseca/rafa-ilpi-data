import { api } from '../services/api'

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

  // Saúde
  healthStatus?: string
  bloodType?: string
  height?: number
  weight?: number
  dependencyLevel?: string
  mobilityAid?: boolean
  specialNeeds?: string
  functionalAspects?: string
  medicationsOnAdmission?: string
  allergies?: string
  chronicConditions?: string
  dietaryRestrictions?: string

  // Acomodação
  roomId?: string
  bedId?: string

  // Status e controle
  status: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
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

  async create(data: any): Promise<Resident> {
    const response = await api.post('/residents', data)
    return response.data
  }

  async update(id: string, data: any): Promise<Resident> {
    const response = await api.patch(`/residents/${id}`, data)
    return response.data
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/residents/${id}`)
  }

  async getStats(): Promise<ResidentStats> {
    const response = await api.get('/residents/stats/overview')
    return response.data
  }
}

export const residentsAPI = new ResidentsAPI()
