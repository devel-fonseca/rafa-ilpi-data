import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCallback } from 'react'
import {
  getQuestions,
  createAssessment,
  getAssessments,
  getAssessment,
  saveResponse,
  completeAssessment,
  generateReport,
  exportPDF,
  compareAssessments,
  deleteAssessment,
  type ComplianceQuestion,
  type ComplianceQuestionVersion,
  type AssessmentResult,
  type CreateAssessmentDto,
  type SubmitResponseDto,
  type QueryAssessmentParams,
  type PaginatedAssessments,
  type ComparisonResult,
} from '@/api/compliance-assessments.api'
import { tenantKey } from '@/lib/query-keys'

// ==================== QUERY HOOKS ====================

/**
 * Hook para buscar questões da RDC 502/2021
 */
export function useAssessmentQuestions(versionId?: string) {
  return useQuery<{
    version: ComplianceQuestionVersion
    questions: ComplianceQuestion[]
  }>({
    queryKey: tenantKey('compliance-assessments', 'questions', versionId),
    queryFn: () => getQuestions(versionId),
    staleTime: 1000 * 60 * 60, // 1 hora (questões são estáticas)
    gcTime: 1000 * 60 * 60 * 24, // 24 horas
  })
}

/**
 * Hook para listar autodiagnósticos com filtros e paginação
 */
export function useAssessments(params?: QueryAssessmentParams) {
  return useQuery<PaginatedAssessments>({
    queryKey: tenantKey('compliance-assessments', 'list', params),
    queryFn: () => getAssessments(params),
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para buscar autodiagnóstico específico com respostas
 */
export function useAssessment(id: string | undefined) {
  const enabled = !!id

  return useQuery<AssessmentResult>({
    queryKey: tenantKey('compliance-assessments', id),
    queryFn: () => {
      if (!id) {
        throw new Error('Assessment ID is required')
      }
      return getAssessment(id)
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}

/**
 * Hook para gerar relatório detalhado
 */
export function useAssessmentReport(id: string | undefined) {
  const enabled = !!id

  return useQuery<AssessmentResult>({
    queryKey: tenantKey('compliance-assessments', 'report', id),
    queryFn: () => {
      if (!id) {
        throw new Error('Assessment ID is required')
      }
      return generateReport(id)
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para comparar assessments históricos
 */
export function useAssessmentComparison(assessmentIds: string[]) {
  const enabled = assessmentIds.length >= 2

  return useQuery<ComparisonResult>({
    queryKey: tenantKey('compliance-assessments', 'comparison', assessmentIds.join(',')),
    queryFn: () => compareAssessments(assessmentIds),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

// ==================== MUTATION HOOKS ====================

/**
 * Hook para criar novo autodiagnóstico
 */
export function useCreateAssessment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAssessmentDto) => createAssessment(data),
    onSuccess: () => {
      // Invalidar lista de assessments
      queryClient.invalidateQueries({
        queryKey: tenantKey('compliance-assessments', 'list'),
      })

      toast.success('Autodiagnóstico iniciado com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao criar autodiagnóstico'
      toast.error(message)
    },
  })
}

/**
 * Hook para salvar resposta individual (auto-save)
 * Usa debounce implícito no componente que chama
 */
export function useSaveResponse(assessmentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SubmitResponseDto) => saveResponse(assessmentId, data),
    onSuccess: () => {
      // Invalidar assessment específico para atualizar progresso
      queryClient.invalidateQueries({
        queryKey: tenantKey('compliance-assessments', assessmentId),
      })

      // NÃO mostrar toast a cada resposta (auto-save silencioso)
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao salvar resposta'
      toast.error(message)
    },
  })
}

/**
 * Hook para finalizar autodiagnóstico
 */
export function useCompleteAssessment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assessmentId: string) => completeAssessment(assessmentId),
    onSuccess: (completedAssessment) => {
      // Invalidar assessment específico
      queryClient.invalidateQueries({
        queryKey: tenantKey('compliance-assessments', completedAssessment.id),
      })

      // Invalidar lista de assessments
      queryClient.invalidateQueries({
        queryKey: tenantKey('compliance-assessments', 'list'),
      })

      toast.success(
        `Autodiagnóstico finalizado! Nível de conformidade: ${completedAssessment.complianceLevel} (${completedAssessment.compliancePercentage.toFixed(1)}%)`,
      )
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao finalizar autodiagnóstico'
      toast.error(message)
    },
  })
}

/**
 * Hook para exportar PDF
 * Retorna função que dispara download do arquivo
 */
export function useExportPDF() {
  return useCallback(async (assessmentId: string) => {
    try {
      toast.loading('Gerando PDF...', { id: 'pdf-export' })

      const pdfBlob = await exportPDF(assessmentId)

      // Criar URL temporária para download
      const url = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `autodiagnostico-rdc-${assessmentId}.pdf`
      document.body.appendChild(link)
      link.click()

      // Limpar
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('PDF exportado com sucesso!', { id: 'pdf-export' })
    } catch (error) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao exportar PDF'
      toast.error(message, { id: 'pdf-export' })
    }
  }, [])
}

/**
 * Hook para excluir autodiagnóstico
 */
export function useDeleteAssessment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assessmentId: string) => deleteAssessment(assessmentId),
    onSuccess: () => {
      // Invalidar lista de assessments
      queryClient.invalidateQueries({
        queryKey: tenantKey('compliance-assessments', 'list'),
      })

      toast.success('Autodiagnóstico excluído com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao excluir autodiagnóstico'
      toast.error(message)
    },
  })
}
