import { api } from '@/services/api'

/**
 * Tipo de registro de vacinação
 */
export interface Vaccination {
  id: string
  tenantId: string
  residentId: string
  // Campos obrigatórios (RDC 502/2021)
  vaccine: string // Nome da vacina/profilaxia
  dose: string // Dose (ex: "1ª dose", "Reforço")
  date: string // Data da vacinação (ISO string)
  batch: string // Lote do imunizante
  manufacturer: string // Fabricante
  cnes: string // CNES do estabelecimento
  healthUnit: string // Nome do estabelecimento de saúde
  municipality: string // Município
  state: string // UF (2 caracteres)
  certificateUrl?: string | null // URL do comprovante
  notes?: string | null // Observações
  // Auditoria
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/**
 * DTO para criar vacinação
 */
export interface CreateVaccinationDto {
  residentId: string
  vaccine: string
  dose: string
  date: string // ISO string
  batch: string
  manufacturer: string
  cnes: string
  healthUnit: string
  municipality: string
  state: string
  certificateUrl?: string
  notes?: string
}

/**
 * DTO para atualizar vacinação
 */
export interface UpdateVaccinationDto {
  vaccine?: string
  dose?: string
  date?: string
  batch?: string
  manufacturer?: string
  cnes?: string
  healthUnit?: string
  municipality?: string
  state?: string
  certificateUrl?: string
  notes?: string
}

/**
 * API de Vacinações
 */
export const vaccinationsAPI = {
  /**
   * Criar novo registro de vacinação
   */
  async create(data: CreateVaccinationDto): Promise<Vaccination> {
    const response = await api.post('/vaccinations', data)
    return response.data
  },

  /**
   * Listar vacinações de um residente
   */
  async findByResident(residentId: string): Promise<Vaccination[]> {
    const response = await api.get(`/vaccinations/resident/${residentId}`)
    return response.data
  },

  /**
   * Obter detalhes de uma vacinação
   */
  async findOne(id: string): Promise<Vaccination> {
    const response = await api.get(`/vaccinations/${id}`)
    return response.data
  },

  /**
   * Atualizar vacinação
   */
  async update(id: string, data: UpdateVaccinationDto): Promise<Vaccination> {
    const response = await api.patch(`/vaccinations/${id}`, data)
    return response.data
  },

  /**
   * Remover vacinação (soft delete)
   */
  async remove(id: string): Promise<void> {
    await api.delete(`/vaccinations/${id}`)
  },
}
