import { api } from '@/services/api'

// ──────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ──────────────────────────────────────────────────────────────────────────────

export type LegalNature = 'ASSOCIACAO' | 'FUNDACAO' | 'EMPRESA_PRIVADA' | 'MEI'

export interface TenantProfile {
  id: string
  tenantId: string
  logoUrl?: string
  logoKey?: string
  legalNature?: LegalNature
  tradeName?: string
  cnesCode?: string
  capacityDeclared?: number
  capacityLicensed?: number
  contactPhone?: string
  contactEmail?: string
  websiteUrl?: string
  foundedAt?: string
  mission?: string
  vision?: string
  values?: string
  notes?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface CreateTenantProfileDto {
  legalNature?: LegalNature
  tradeName?: string
  cnesCode?: string
  capacityDeclared?: number
  capacityLicensed?: number
  contactPhone?: string
  contactEmail?: string
  websiteUrl?: string
  foundedAt?: string
  mission?: string
  vision?: string
  values?: string
  notes?: string
}

export interface UpdateTenantProfileDto extends Partial<CreateTenantProfileDto> {}

export interface TenantData {
  id: string
  name: string
  cnpj?: string
  email: string
  phone?: string
  addressStreet?: string
  addressNumber?: string
  addressComplement?: string
  addressDistrict?: string
  addressCity?: string
  addressState?: string
  addressZipCode?: string
}

export interface FullProfile {
  tenant: TenantData
  profile: TenantProfile | null
}

export interface UpdateTenantDto {
  phone?: string
  email?: string
  addressZipCode?: string
  addressStreet?: string
  addressNumber?: string
  addressComplement?: string
  addressDistrict?: string
  addressCity?: string
  addressState?: string
}

export interface UpdateInstitutionalProfileDto {
  profile?: UpdateTenantProfileDto
  tenant?: UpdateTenantDto
}

// ──────────────────────────────────────────────────────────────────────────────
// API CLIENT
// ──────────────────────────────────────────────────────────────────────────────

class InstitutionalProfileAPI {
  private baseUrl = '/institutional-profile'

  // ────────────────────────────────────────────────────────────────────────────
  // PROFILE
  // ────────────────────────────────────────────────────────────────────────────

  async getProfile(): Promise<FullProfile> {
    const response = await api.get<FullProfile>(`${this.baseUrl}`)
    return response.data
  }

  async createOrUpdateProfile(data: UpdateInstitutionalProfileDto): Promise<FullProfile> {
    const response = await api.post<FullProfile>(`${this.baseUrl}`, data)
    return response.data
  }

  async uploadLogo(file: File): Promise<TenantProfile> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<TenantProfile>(`${this.baseUrl}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }
}

export const institutionalProfileAPI = new InstitutionalProfileAPI()
