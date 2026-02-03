// ─────────────────────────────────────────────────────────────────────────────
//  PERTENCES DE RESIDENTES - TYPES
// ─────────────────────────────────────────────────────────────────────────────

// Enums
export enum BelongingCategory {
  DOCUMENTOS = 'DOCUMENTOS',
  VESTUARIO = 'VESTUARIO',
  CALCADOS = 'CALCADOS',
  ITENS_HIGIENE = 'ITENS_HIGIENE',
  ELETRONICOS = 'ELETRONICOS',
  OBJETOS_VALOR = 'OBJETOS_VALOR',
  AUXILIARES_MOBILIDADE = 'AUXILIARES_MOBILIDADE',
  PROTESES_ORTESES = 'PROTESES_ORTESES',
  ITENS_AFETIVOS = 'ITENS_AFETIVOS',
  OUTROS = 'OUTROS',
}

export enum ConservationState {
  NOVO = 'NOVO',
  BOM = 'BOM',
  REGULAR = 'REGULAR',
  RUIM = 'RUIM',
  AVARIADO = 'AVARIADO',
}

export enum BelongingStatus {
  EM_GUARDA = 'EM_GUARDA',
  DEVOLVIDO = 'DEVOLVIDO',
  EXTRAVIADO = 'EXTRAVIADO',
  DESCARTADO = 'DESCARTADO',
}

export enum BelongingTermType {
  RECEBIMENTO = 'RECEBIMENTO',
  ATUALIZACAO = 'ATUALIZACAO',
  DEVOLUCAO_FINAL = 'DEVOLUCAO_FINAL',
}

export enum BelongingTermStatus {
  PENDENTE = 'PENDENTE',
  ASSINADO = 'ASSINADO',
  CANCELADO = 'CANCELADO',
}

export enum BelongingMovementType {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
  ALTERACAO_ESTADO = 'ALTERACAO_ESTADO',
}

export enum BelongingAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  DELETED = 'DELETED',
}

// Labels para UI
export const CATEGORY_LABELS: Record<BelongingCategory, string> = {
  [BelongingCategory.DOCUMENTOS]: 'Documentos',
  [BelongingCategory.VESTUARIO]: 'Vestuário',
  [BelongingCategory.CALCADOS]: 'Calçados',
  [BelongingCategory.ITENS_HIGIENE]: 'Itens de Higiene',
  [BelongingCategory.ELETRONICOS]: 'Eletrônicos',
  [BelongingCategory.OBJETOS_VALOR]: 'Objetos de Valor',
  [BelongingCategory.AUXILIARES_MOBILIDADE]: 'Auxiliares de Mobilidade',
  [BelongingCategory.PROTESES_ORTESES]: 'Próteses/Órteses',
  [BelongingCategory.ITENS_AFETIVOS]: 'Itens Afetivos',
  [BelongingCategory.OUTROS]: 'Outros',
}

export const CONSERVATION_STATE_LABELS: Record<ConservationState, string> = {
  [ConservationState.NOVO]: 'Novo',
  [ConservationState.BOM]: 'Bom',
  [ConservationState.REGULAR]: 'Regular',
  [ConservationState.RUIM]: 'Ruim',
  [ConservationState.AVARIADO]: 'Avariado',
}

export const STATUS_LABELS: Record<BelongingStatus, string> = {
  [BelongingStatus.EM_GUARDA]: 'Em Guarda',
  [BelongingStatus.DEVOLVIDO]: 'Devolvido',
  [BelongingStatus.EXTRAVIADO]: 'Extraviado',
  [BelongingStatus.DESCARTADO]: 'Descartado',
}

export const TERM_TYPE_LABELS: Record<BelongingTermType, string> = {
  [BelongingTermType.RECEBIMENTO]: 'Recebimento',
  [BelongingTermType.ATUALIZACAO]: 'Atualização',
  [BelongingTermType.DEVOLUCAO_FINAL]: 'Devolução Final',
}

export const TERM_STATUS_LABELS: Record<BelongingTermStatus, string> = {
  [BelongingTermStatus.PENDENTE]: 'Pendente',
  [BelongingTermStatus.ASSINADO]: 'Assinado',
  [BelongingTermStatus.CANCELADO]: 'Cancelado',
}

export const MOVEMENT_TYPE_LABELS: Record<BelongingMovementType, string> = {
  [BelongingMovementType.ENTRADA]: 'Entrada',
  [BelongingMovementType.SAIDA]: 'Saída',
  [BelongingMovementType.ALTERACAO_ESTADO]: 'Alteração de Estado',
}

// Interfaces
export interface ResidentBelonging {
  id: string
  tenantId: string
  residentId: string
  category: BelongingCategory
  description: string
  brandModel?: string | null
  quantity: number
  conservationState: ConservationState
  identification?: string | null
  declaredValue?: number | null
  storageLocation?: string | null
  entryDate: string
  deliveredBy: string
  receivedBy: string
  entryTermId?: string | null
  exitDate?: string | null
  exitReceivedBy?: string | null
  exitReason?: string | null
  exitTermId?: string | null
  status: BelongingStatus
  notes?: string | null
  photoUrl?: string | null
  photoKey?: string | null
  createdBy: string
  updatedBy?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  resident?: {
    id: string
    fullName: string
  }
  creator?: {
    id: string
    name: string
  }
  updater?: {
    id: string
    name: string
  } | null
  entryTerm?: {
    id: string
    termNumber: string
    type: BelongingTermType
  } | null
  exitTerm?: {
    id: string
    termNumber: string
    type: BelongingTermType
  } | null
}

export interface BelongingTerm {
  id: string
  tenantId: string
  residentId: string
  type: BelongingTermType
  termNumber: string
  sequenceNumber: number
  termDate: string
  issuedBy: string
  receivedBy?: string | null
  receiverDocument?: string | null
  notes?: string | null
  signedFileUrl?: string | null
  signedFileKey?: string | null
  signedFileName?: string | null
  signedFileSize?: number | null
  signedFileHash?: string | null
  status: BelongingTermStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  resident?: {
    id: string
    fullName: string
    cpf: string
  }
  creator?: {
    id: string
    name: string
  }
  items?: BelongingTermItem[]
  _count?: {
    items: number
  }
}

export interface BelongingTermItem {
  id: string
  termId: string
  belongingId: string
  movementType: BelongingMovementType
  snapshotData: Record<string, unknown>
  previousState?: ConservationState | null
  newState?: ConservationState | null
  stateChangeReason?: string | null
  belonging?: {
    id: string
    description: string
    category: BelongingCategory
    status: BelongingStatus
  }
}

export interface BelongingHistory {
  id: string
  tenantId: string
  belongingId: string
  action: BelongingAction
  reason?: string | null
  previousData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
  changedFields: string[]
  changedBy: string
  changedAt: string
  changer?: {
    id: string
    name: string
  }
}

// DTOs
export interface CreateBelongingDto {
  category: BelongingCategory
  description: string
  brandModel?: string
  quantity?: number
  conservationState: ConservationState
  identification?: string
  declaredValue?: number
  storageLocation?: string
  entryDate: string
  deliveredBy: string
  receivedBy: string
  notes?: string
}

export interface UpdateBelongingDto {
  description?: string
  brandModel?: string
  quantity?: number
  conservationState?: ConservationState
  identification?: string
  declaredValue?: number
  storageLocation?: string
  notes?: string
  changeReason: string
}

export interface ChangeStatusDto {
  status: BelongingStatus
  reason: string
  exitDate?: string
  exitReceivedBy?: string
}

export interface QueryBelongingDto {
  category?: BelongingCategory
  status?: BelongingStatus
  search?: string
  entryDateFrom?: string
  entryDateTo?: string
  includeDeleted?: boolean
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface TermItemDto {
  belongingId: string
  movementType: BelongingMovementType
  previousState?: ConservationState
  newState?: ConservationState
  stateChangeReason?: string
}

export interface CreateTermDto {
  type: BelongingTermType
  termDate: string
  issuedBy: string
  receivedBy?: string
  receiverDocument?: string
  notes?: string
  items: TermItemDto[]
}

// Responses
export interface PaginatedBelongingsResponse {
  items: ResidentBelonging[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BelongingStats {
  byCategory: {
    category: BelongingCategory
    count: number
  }[]
  byStatus: {
    status: BelongingStatus
    count: number
  }[]
  totals: {
    totalItems: number
    totalQuantity: number
    totalDeclaredValue: number
  }
}

export interface TermPrintData {
  term: {
    id: string
    termNumber: string
    type: BelongingTermType
    termDate: string
    issuedBy: string
    receivedBy?: string | null
    receiverDocument?: string | null
    notes?: string | null
    status: BelongingTermStatus
  }
  tenant: {
    name: string
    cnpj: string
  }
  resident: {
    fullName: string
    cpf: string
    admissionDate: string
    bedCode?: string | null
  }
  items: {
    entradas: (Record<string, unknown> & { belongingId: string })[]
    saidas: (Record<string, unknown> & { belongingId: string })[]
    alteracoes: (Record<string, unknown> & {
      belongingId: string
      previousState?: ConservationState | null
      newState?: ConservationState | null
      stateChangeReason?: string | null
    })[]
  }
  totals: {
    totalItems: number
    totalEntradas: number
    totalSaidas: number
    totalAlteracoes: number
  }
}
