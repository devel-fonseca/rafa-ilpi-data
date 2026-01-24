import { api } from '@/services/api'

// ==================== TYPES ====================

export type AssessmentStatus = 'DRAFT' | 'COMPLETED' | 'ARCHIVED'
export type ComplianceLevel = 'REGULAR' | 'PARCIAL' | 'IRREGULAR'

/**
 * Versão da regulamentação RDC 502/2021
 */
export interface ComplianceQuestionVersion {
  id: string
  regulationName: string
  versionNumber: number
  effectiveDate: string
  expiresAt: string | null
  description: string | null
}

/**
 * Questão do autodiagnóstico
 */
export interface ComplianceQuestion {
  id: string
  versionId: string
  questionNumber: number
  questionText: string
  criticalityLevel: 'C' | 'NC'
  legalReference: string
  category: string | null
  responseOptions: ResponseOption[]
}

/**
 * Opção de resposta de uma questão
 */
export interface ResponseOption {
  points: number
  text: string
}

/**
 * Resposta de uma questão
 */
export interface ComplianceAssessmentResponse {
  id: string
  assessmentId: string
  questionId: string
  questionNumber: number
  selectedPoints?: number
  selectedText?: string
  isNotApplicable: boolean
  questionTextSnapshot: string
  criticalityLevel: 'C' | 'NC'
  observations?: string
}

/**
 * Autodiagnóstico de conformidade
 */
export interface ComplianceAssessment {
  id: string
  tenantId: string
  versionId: string
  assessmentDate: string
  performedBy?: string
  status: AssessmentStatus
  totalQuestions: number
  questionsAnswered: number
  questionsNA: number
  applicableQuestions: number
  totalPointsObtained: number
  totalPointsPossible: number
  compliancePercentage: number
  complianceLevel: ComplianceLevel
  notes?: string
  criticalNonCompliant?: CriticalNonCompliant[]
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

/**
 * Assessment completo com respostas
 */
export interface AssessmentResult extends ComplianceAssessment {
  responses?: ComplianceAssessmentResponse[]
  categoryStats?: CategoryStats[]
}

/**
 * Não conformidade crítica
 */
export interface CriticalNonCompliant {
  questionNumber: number
  questionText: string
  pointsObtained: number
}

/**
 * Estatísticas por categoria
 */
export interface CategoryStats {
  category: string
  totalQuestions: number
  questionsAnswered: number
  pointsObtained: number
  pointsPossible: number
  percentage: number
}

/**
 * Resposta paginada de assessments
 */
export interface PaginatedAssessments {
  data: ComplianceAssessment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Comparação de assessments históricos
 */
export interface AssessmentComparison {
  id: string
  assessmentDate: string
  compliancePercentage: number
  complianceLevel: ComplianceLevel
  totalPointsObtained: number
  totalPointsPossible: number
  criticalNonCompliantCount: number
}

/**
 * Resultado de comparação histórica
 */
export interface ComparisonResult {
  assessments: AssessmentComparison[]
  percentageEvolution: number
  pointsEvolution: number
  improvementsCount: number
  regressionsCount: number
  trend: 'MELHORANDO' | 'ESTAGNADO' | 'PIORANDO'
}

// ==================== DTOs ====================

/**
 * DTO para criar novo autodiagnóstico
 */
export interface CreateAssessmentDto {
  versionId?: string
  notes?: string
}

/**
 * DTO para submeter resposta de questão
 */
export interface SubmitResponseDto {
  questionId: string
  questionNumber: number
  selectedPoints?: number
  selectedText?: string
  isNotApplicable: boolean
  observations?: string
}

/**
 * Parâmetros de filtro para listagem
 */
export interface QueryAssessmentParams {
  page?: number
  limit?: number
  status?: AssessmentStatus
  complianceLevel?: ComplianceLevel
  versionId?: string
  startDate?: string
  endDate?: string
  performedBy?: string
}

// ==================== API FUNCTIONS ====================

/**
 * Buscar questões da versão atual ou específica da RDC 502/2021
 */
export async function getQuestions(versionId?: string): Promise<{
  version: ComplianceQuestionVersion
  questions: ComplianceQuestion[]
}> {
  const params = versionId ? { versionId } : {}
  const response = await api.get('/compliance-assessments/questions', { params })
  return response.data
}

/**
 * Criar novo autodiagnóstico
 */
export async function createAssessment(data: CreateAssessmentDto): Promise<ComplianceAssessment> {
  const response = await api.post('/compliance-assessments', data)
  return response.data
}

/**
 * Listar autodiagnósticos com filtros e paginação
 */
export async function getAssessments(params?: QueryAssessmentParams): Promise<PaginatedAssessments> {
  const response = await api.get('/compliance-assessments', { params })
  return response.data
}

/**
 * Buscar autodiagnóstico específico com respostas
 */
export async function getAssessment(id: string): Promise<AssessmentResult> {
  const response = await api.get(`/compliance-assessments/${id}`)
  return response.data
}

/**
 * Salvar resposta individual (auto-save)
 */
export async function saveResponse(
  assessmentId: string,
  data: SubmitResponseDto,
): Promise<ComplianceAssessmentResponse> {
  const response = await api.post(`/compliance-assessments/${assessmentId}/responses`, data)
  return response.data
}

/**
 * Finalizar autodiagnóstico e calcular pontuação
 */
export async function completeAssessment(assessmentId: string): Promise<ComplianceAssessment> {
  const response = await api.post(`/compliance-assessments/${assessmentId}/complete`)
  return response.data
}

/**
 * Gerar relatório detalhado (JSON)
 */
export async function generateReport(assessmentId: string): Promise<AssessmentResult> {
  const response = await api.get(`/compliance-assessments/${assessmentId}/report`)
  return response.data
}

/**
 * Exportar autodiagnóstico como PDF
 */
export async function exportPDF(assessmentId: string): Promise<Blob> {
  const response = await api.get(`/compliance-assessments/${assessmentId}/pdf`, {
    responseType: 'blob',
  })
  return response.data
}

/**
 * Comparar múltiplos assessments históricos
 */
export async function compareAssessments(assessmentIds: string[]): Promise<ComparisonResult> {
  const response = await api.get('/compliance-assessments/history/comparison', {
    params: { ids: assessmentIds.join(',') },
  })
  return response.data
}

/**
 * Excluir autodiagnóstico
 */
export async function deleteAssessment(assessmentId: string): Promise<void> {
  await api.delete(`/compliance-assessments/${assessmentId}`)
}
