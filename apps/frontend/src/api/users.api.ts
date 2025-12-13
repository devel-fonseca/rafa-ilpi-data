import { api } from '../services/api'

// ========== TYPES & INTERFACES ==========

export type UserRole = 'ADMIN' | 'COORDENADOR' | 'ENFERMEIRO' | 'TECNICO_ENFERMAGEM' | 'CUIDADOR' | 'MEDICO' | 'NUTRICIONISTA' | 'FISIOTERAPEUTA' | 'PSICOLOGO' | 'ASSISTENTE_SOCIAL'

export interface User {
  id: string
  tenantId: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  versionNumber: number
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface UserHistoryEntry {
  id: string
  tenantId: string
  userId: string
  versionNumber: number
  changeType: 'CREATE' | 'UPDATE' | 'DELETE'
  changeReason: string
  previousData: Partial<User> | null
  newData: Partial<User>
  changedFields: string[]
  changedAt: string
  changedBy: string
  changedByName: string
  ipAddress?: string
  userAgent?: string
}

export interface UserHistoryResponse {
  userId: string
  userName: string
  userEmail: string
  currentVersion: number
  totalVersions: number
  history: UserHistoryEntry[]
}

export interface CreateUserDto {
  email: string
  password: string
  name: string
  role: UserRole
  isActive?: boolean
}

export interface UpdateUserDto {
  name?: string
  email?: string
  password?: string
  role?: UserRole
  isActive?: boolean
  changeReason: string
}

export interface DeleteUserDto {
  deleteReason: string
}

// ========== API FUNCTIONS ==========

export const usersApi = {
  /**
   * Listar todos os usuários do tenant
   */
  async getAll(): Promise<User[]> {
    const response = await api.get('/users')
    return response.data
  },

  /**
   * Buscar usuário por ID
   */
  async getById(id: string): Promise<User> {
    const response = await api.get(`/users/${id}`)
    return response.data
  },

  /**
   * Criar novo usuário
   */
  async create(data: CreateUserDto): Promise<User> {
    const response = await api.post('/users', data)
    return response.data
  },

  /**
   * Atualizar usuário com versionamento
   * @param id - ID do usuário
   * @param data - Dados a atualizar (deve incluir changeReason)
   */
  async update(id: string, data: UpdateUserDto): Promise<User> {
    const response = await api.patch(`/users/${id}`, data)
    return response.data
  },

  /**
   * Excluir usuário (soft delete) com versionamento
   * @param id - ID do usuário
   * @param deleteReason - Motivo da exclusão (mínimo 10 caracteres)
   */
  async remove(id: string, deleteReason: string): Promise<{ message: string }> {
    const response = await api.delete(`/users/${id}`, {
      data: { deleteReason },
    })
    return response.data
  },

  /**
   * Consultar histórico completo de alterações do usuário
   * @param id - ID do usuário
   */
  async getHistory(id: string): Promise<UserHistoryResponse> {
    const response = await api.get(`/users/${id}/history`)
    return response.data
  },

  /**
   * Consultar versão específica do histórico
   * @param id - ID do usuário
   * @param version - Número da versão
   */
  async getHistoryVersion(id: string, version: number): Promise<UserHistoryEntry> {
    const response = await api.get(`/users/${id}/history/${version}`)
    return response.data
  },
}
