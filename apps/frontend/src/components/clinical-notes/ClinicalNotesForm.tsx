import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, X, Activity, FileText, Eye, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DocumentPreviewModal } from './DocumentPreviewModal'
import { DocumentEditorModal } from './DocumentEditorModal'
import { toast } from 'sonner'
import { getCurrentDateTimeLocal, formatDateTimeSafe } from '@/utils/dateHelpers'
import { generateDocumentPdf } from '@/utils/generateDocumentPdf'
import { useProfile } from '@/hooks/useInstitutionalProfile'
import { useResident } from '@/hooks/useResidents'
import { useAuthStore } from '@/stores/auth.store'
import { useMyProfile } from '@/hooks/queries/useUserProfile'
import { POSITION_CODE_LABELS, PositionCode } from '@/types/permissions'
import {
  useCreateClinicalNote,
  useUpdateClinicalNote,
  useClinicalNoteTags,
  useAuthorizedProfessions,
} from '@/hooks/useClinicalNotes'
import { createClinicalNoteWithDocument } from '@/api/clinicalNotes.api'
import { useLastVitalSign } from '@/hooks/useVitalSigns'
import type { ClinicalNote, ClinicalProfession } from '@/api/clinicalNotes.api'
import { SOAPTemplateFields } from './SOAPTemplateFields'
import {
  getProfessionConfig,
  DEFAULT_CLINICAL_TAGS,
  PROFESSION_CONFIG,
} from '@/utils/clinicalNotesConstants'
import { devLogger } from '@/utils/devLogger'
import { formatVitalSignsToText } from '@/utils/vitalSignsFormatter'

/**
 * Mapeia positionCode + registrationType para a profissão clínica correspondente
 * Para TECHNICAL_MANAGER, usa o registrationType para determinar a profissão
 */
function getUserProfession(
  positionCode?: string | null,
  registrationType?: string | null,
): ClinicalProfession | null {
  if (!positionCode) return null

  // Mapeamento direto por cargo
  const positionToProfession: Record<string, ClinicalProfession> = {
    DOCTOR: 'MEDICINE',
    NURSE: 'NURSING',
    NURSING_COORDINATOR: 'NURSING',
    NUTRITIONIST: 'NUTRITION',
    PHYSIOTHERAPIST: 'PHYSIOTHERAPY',
    PSYCHOLOGIST: 'PSYCHOLOGY',
    SOCIAL_WORKER: 'SOCIAL_WORK',
    SPEECH_THERAPIST: 'SPEECH_THERAPY',
    OCCUPATIONAL_THERAPIST: 'OCCUPATIONAL_THERAPY',
  }

  // Se não é RT, retornar mapeamento direto
  if (positionCode !== 'TECHNICAL_MANAGER') {
    return positionToProfession[positionCode] || null
  }

  // Para RT, mapear por registrationType (conselho profissional)
  const registrationToProfession: Record<string, ClinicalProfession> = {
    CRM: 'MEDICINE',
    COREN: 'NURSING',
    CRN: 'NUTRITION',
    CREFITO: 'PHYSIOTHERAPY',
    CRP: 'PSYCHOLOGY',
    CRESS: 'SOCIAL_WORK',
    CREFONO: 'SPEECH_THERAPY',
  }

  return registrationType ? registrationToProfession[registrationType] || null : null
}

// Validação com Zod
const clinicalNoteSchema = z
  .object({
    profession: z.enum([
      'MEDICINE',
      'NURSING',
      'NUTRITION',
      'PHYSIOTHERAPY',
      'PSYCHOLOGY',
      'SOCIAL_WORK',
      'SPEECH_THERAPY',
      'OCCUPATIONAL_THERAPY',
    ]),
    noteDate: z.string().min(1, 'Data/hora é obrigatória'),
    subjective: z.string().optional(),
    objective: z.string().optional(),
    assessment: z.string().optional(),
    plan: z.string().optional(),
    tags: z.array(z.string()).optional(),
    editReason: z.string().optional(), // Apenas para edição
  })
  .refine(
    (data) => data.subjective || data.objective || data.assessment || data.plan,
    {
      message: 'Ao menos um campo SOAP (S, O, A ou P) deve ser preenchido',
      path: ['subjective'],
    }
  )

type ClinicalNoteFormData = z.infer<typeof clinicalNoteSchema>

interface ClinicalNotesFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  residentName?: string
  note?: ClinicalNote
  onSuccess?: () => void
}

export function ClinicalNotesForm({
  open,
  onOpenChange,
  residentId,
  residentName,
  note,
  onSuccess,
}: ClinicalNotesFormProps) {
  const isEditing = !!note
  const [customTagInput, setCustomTagInput] = useState('')

  // Estados para documento opcional
  const [documentEnabled, setDocumentEnabled] = useState(false)
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [documentContent, setDocumentContent] = useState('')
  const [showEditorModal, setShowEditorModal] = useState(false)

  // Estados para preview do documento
  const [showPreview, setShowPreview] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<ClinicalNoteFormData | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const createMutation = useCreateClinicalNote()
  const updateMutation = useUpdateClinicalNote()
  const { data: suggestedTags = [] } = useClinicalNoteTags()
  const { data: lastVitalSign, isLoading: vitalSignsLoading } = useLastVitalSign(residentId)
  const { data: authorizedProfessions = [], isLoading: authorizationLoading } = useAuthorizedProfessions()
  const { data: profileData } = useProfile()
  const { data: residentData } = useResident(residentId)
  const { data: myProfile } = useMyProfile()
  const { user } = useAuthStore()

  const isLoading = createMutation.isPending || updateMutation.isPending

  // Detectar profissão do usuário logado baseado em cargo e registro profissional
  const userProfession = useMemo(() => {
    return getUserProfession(
      user?.profile?.positionCode,
      user?.profile?.registrationType,
    )
  }, [user?.profile?.positionCode, user?.profile?.registrationType])

  // Filtrar profissões disponíveis: se userProfession detectado, mostrar apenas essa
  const availableProfessions = useMemo(() => {
    if (userProfession) {
      return authorizedProfessions.filter((prof) => prof === userProfession)
    }
    return authorizedProfessions
  }, [userProfession, authorizedProfessions])

  // Helper para mapear dados profissionais do perfil do usuário (memoizado para evitar re-renders infinitos)
  const professionalData = useMemo(() => {
    if (!user || !myProfile) {
      return { name: user?.name || '' }
    }

    return {
      name: user.name,
      profession: myProfile.positionCode
        ? POSITION_CODE_LABELS[myProfile.positionCode as PositionCode]
        : undefined,
      council: myProfile.registrationType || undefined,
      councilNumber: myProfile.registrationNumber || undefined,
      councilState: myProfile.registrationState || undefined,
    }
  }, [user, myProfile])

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ClinicalNoteFormData>({
    resolver: zodResolver(clinicalNoteSchema),
    defaultValues: note
      ? {
          profession: note.profession,
          noteDate: note.noteDate,
          subjective: note.subjective || '',
          objective: note.objective || '',
          assessment: note.assessment || '',
          plan: note.plan || '',
          tags: note.tags || [],
          editReason: '',
        }
      : {
          profession: 'MEDICINE',
          noteDate: getCurrentDateTimeLocal(),
          subjective: '',
          objective: '',
          assessment: '',
          plan: '',
          tags: [],
        },
  })

  const selectedProfession = watch('profession')
  const selectedTags = watch('tags') || []
  const subjective = watch('subjective') || ''
  const objective = watch('objective') || ''
  const assessment = watch('assessment') || ''
  const plan = watch('plan') || ''

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset()
      setCustomTagInput('')
      // Limpar estados do documento
      setDocumentEnabled(false)
      setDocumentTitle('')
      setDocumentType('')
      setDocumentContent('')
      setShowEditorModal(false)
    }
  }, [open, reset])

  // Auto-selecionar profissão do usuário ao abrir (apenas em criação)
  useEffect(() => {
    if (open && !isEditing && availableProfessions.length > 0) {
      // Se userProfession detectado, usar ele; senão, usar primeira profissão autorizada
      const professionToSelect = userProfession || availableProfessions[0]
      setValue('profession', professionToSelect)
    }
  }, [open, isEditing, availableProfessions, userProfession, setValue])

  // Populate form with note values when editing
  useEffect(() => {
    if (open && note) {
      reset({
        profession: note.profession,
        noteDate: note.noteDate,
        subjective: note.subjective || '',
        objective: note.objective || '',
        assessment: note.assessment || '',
        plan: note.plan || '',
        tags: note.tags || [],
        editReason: '',
      })
    }
  }, [open, note, reset])

  // Combinar tags pré-definidas + tags sugeridas do backend (sem duplicatas)
  const allAvailableTags = Array.from(
    new Set([
      ...DEFAULT_CLINICAL_TAGS.map((t) => t.value),
      ...suggestedTags,
    ])
  )

  const addTag = (tagValue: string) => {
    if (!tagValue.trim()) return
    if (selectedTags.includes(tagValue)) {
      toast.error('Tag já adicionada')
      return
    }

    setValue('tags', [...selectedTags, tagValue])
    setCustomTagInput('')
  }

  const removeTag = (tagValue: string) => {
    setValue(
      'tags',
      selectedTags.filter((t) => t !== tagValue)
    )
  }

  const insertVitalSignsIntoObjective = () => {
    const vitalSignsText = formatVitalSignsToText(lastVitalSign)
    const currentObjective = objective || ''
    const newObjective = currentObjective
      ? `${currentObjective}\n\n${vitalSignsText}`
      : vitalSignsText
    setValue('objective', newObjective)
    toast.success('Sinais vitais inseridos no campo Objetivo')
  }

  const onSubmit = async (data: ClinicalNoteFormData) => {
    try {
      if (isEditing) {
        // Validar editReason
        if (!data.editReason || data.editReason.trim().length < 10) {
          toast.error('Motivo da edição deve ter no mínimo 10 caracteres')
          return
        }

        await updateMutation.mutateAsync({
          id: note.id,
          data: {
            subjective: data.subjective || undefined,
            objective: data.objective || undefined,
            assessment: data.assessment || undefined,
            plan: data.plan || undefined,
            tags: data.tags || [],
            editReason: data.editReason,
          },
        })

        onOpenChange(false)
        onSuccess?.()
      } else {
        // Verificar autenticação antes de iniciar
        if (!user) {
          toast.error('Sessão expirada. Por favor, faça login novamente.')
          devLogger.error('❌ [onSubmit] Usuário não autenticado')
          return
        }

        // Validação do documento se habilitado
        if (documentEnabled) {
          if (!documentTitle || documentTitle.trim().length < 3) {
            toast.error('Título do documento deve ter no mínimo 3 caracteres')
            return
          }
          if (!documentContent || documentContent.trim().length < 10) {
            toast.error('Conteúdo do documento deve ser preenchido')
            return
          }
        }

        devLogger.log('🚀 [onSubmit] Salvando evolução clínica...', {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
        })

        // Preparar dados da evolução
        const clinicalNoteData = {
          residentId,
          profession: data.profession,
          noteDate: data.noteDate,
          subjective: data.subjective || undefined,
          objective: data.objective || undefined,
          assessment: data.assessment || undefined,
          plan: data.plan || undefined,
          tags: data.tags || [],
          document:
            documentEnabled && documentTitle && documentContent
              ? {
                  title: documentTitle,
                  type: documentType || undefined,
                  htmlContent: documentContent,
                }
              : undefined,
        }

        devLogger.log('📋 [onSubmit] Dados preparados:', {
          hasDocument: !!clinicalNoteData.document,
          documentTitle,
          contentLength: documentContent?.length,
        })

        let pdfBlob: Blob | undefined

        // Gerar PDF se documento estiver habilitado
        if (documentEnabled && documentTitle && documentContent && residentData && user) {
          try {
            devLogger.log('📄 [onSubmit] Gerando PDF do documento...')
            toast.info('Gerando PDF do documento...')

            pdfBlob = await generateDocumentPdf({
              title: documentTitle,
              content: documentContent,
              resident: {
                fullName: residentData.fullName,
                birthDate: residentData.birthDate,
                cpf: residentData.cpf || '',
                cns: residentData.cns || undefined,
                admissionDate: residentData.admissionDate || undefined,
              },
              professional: professionalData,
              date: data.noteDate || new Date().toISOString(),
              documentId: undefined,
              institutionalData: profileData?.profile
                ? {
                    tenantName: profileData.tenant?.name,
                    logoUrl: profileData.profile.logoUrl || undefined,
                    cnpj: profileData.tenant?.cnpj || undefined,
                    cnesCode: profileData.profile.cnesCode || undefined,
                    phone: profileData.tenant?.phone || undefined,
                    email: profileData.tenant?.email || undefined,
                    addressStreet: profileData.tenant?.addressStreet || undefined,
                    addressNumber: profileData.tenant?.addressNumber || undefined,
                    addressDistrict: profileData.tenant?.addressDistrict || undefined,
                    addressCity: profileData.tenant?.addressCity || undefined,
                    addressState: profileData.tenant?.addressState || undefined,
                    addressZipCode: profileData.tenant?.addressZipCode || undefined,
                  }
                : undefined,
            })

            devLogger.log('✅ [onSubmit] PDF gerado com sucesso!', {
              pdfSize: pdfBlob.size,
              pdfType: pdfBlob.type,
            })
          } catch (pdfError) {
            devLogger.error('❌ [onSubmit] Erro ao gerar PDF:', pdfError)
            toast.error('Erro ao gerar PDF do documento')
            return
          }
        }

        // Salvar evolução com ou sem documento
        devLogger.log('💾 [onSubmit] Salvando no servidor...', {
          hasPdf: !!pdfBlob,
          hasDocument: !!clinicalNoteData.document,
        })

        try {
          if (pdfBlob) {
            devLogger.log('📤 [onSubmit] Enviando com PDF via FormData...')
            await createClinicalNoteWithDocument(clinicalNoteData, pdfBlob)
          } else {
            devLogger.log('📤 [onSubmit] Enviando sem PDF...')
            await createClinicalNoteWithDocument(clinicalNoteData, undefined)
          }

          devLogger.log('✅ [onSubmit] Salvo com sucesso!')
          toast.success('Evolução salva com sucesso!')
          onOpenChange(false)
          onSuccess?.()
        } catch (saveError: unknown) {
          devLogger.error('❌ [onSubmit] Erro ao salvar:', saveError)

          // Tratamento específico para erros de autenticação
          const errorResponse = (saveError as { response?: { status?: number } }).response
          if (errorResponse?.status === 401 || errorResponse?.status === 403) {
            toast.error('Sessão expirada durante o salvamento. Por favor, faça login novamente.')
          } else {
            toast.error('Erro ao salvar evolução clínica')
          }
          throw saveError
        }
      }
    } catch (error: unknown) {
      // Erro já tratado pelo hook com toast
      devLogger.error('Erro ao salvar evolução:', error)
    }
  }

  // Função para confirmar salvamento após preview
  const handleConfirmSave = async () => {
    if (!pendingFormData) return

    try {
      setIsConfirming(true)
      devLogger.log('🚀 [handleConfirmSave] Iniciando salvamento...')

      // Verificar autenticação antes de iniciar
      if (!user) {
        toast.error('Sessão expirada. Por favor, faça login novamente.')
        devLogger.error('❌ [handleConfirmSave] Usuário não autenticado')
        setShowPreview(false)
        return
      }

      // Preparar dados da evolução
      const clinicalNoteData = {
        residentId,
        profession: pendingFormData.profession,
        noteDate: pendingFormData.noteDate,
        subjective: pendingFormData.subjective || undefined,
        objective: pendingFormData.objective || undefined,
        assessment: pendingFormData.assessment || undefined,
        plan: pendingFormData.plan || undefined,
        tags: pendingFormData.tags || [],
        document:
          documentEnabled && documentTitle && documentContent
            ? {
                title: documentTitle,
                type: documentType || undefined,
                htmlContent: documentContent,
              }
            : undefined,
      }

      devLogger.log('📋 [handleConfirmSave] Dados preparados:', {
        hasDocument: !!clinicalNoteData.document,
        documentTitle,
        contentLength: documentContent?.length,
      })

      // Se tem documento, gerar PDF agora
      let pdfBlob: Blob | undefined
      if (documentEnabled && documentTitle && documentContent && residentData && user) {
        devLogger.log('📄 [handleConfirmSave] Gerando PDF para envio...')
        toast.info('Gerando PDF do documento...')

        try {
          pdfBlob = await generateDocumentPdf({
            title: documentTitle,
            content: documentContent,
            resident: {
              fullName: residentData.fullName,
              birthDate: residentData.birthDate,
              cpf: residentData.cpf || '',
              cns: residentData.cns || undefined,
              admissionDate: residentData.admissionDate || undefined,
            },
            professional: professionalData,
            date: pendingFormData.noteDate || new Date().toISOString(),
            documentId: undefined, // TODO: Gerar UUID ao criar documento
            institutionalData: profileData?.profile
              ? {
                  tenantName: profileData.tenant?.name,
                  logoUrl: profileData.profile.logoUrl || undefined,
                  cnpj: profileData.tenant?.cnpj || undefined,
                  cnesCode: profileData.profile.cnesCode || undefined,
                  phone: profileData.tenant?.phone || undefined,
                  email: profileData.tenant?.email || undefined,
                  addressStreet: profileData.tenant?.addressStreet || undefined,
                  addressNumber: profileData.tenant?.addressNumber || undefined,
                  addressDistrict: profileData.tenant?.addressDistrict || undefined,
                  addressCity: profileData.tenant?.addressCity || undefined,
                  addressState: profileData.tenant?.addressState || undefined,
                  addressZipCode: profileData.tenant?.addressZipCode || undefined,
                }
              : undefined,
          })

          devLogger.log('✅ [handleConfirmSave] PDF gerado com sucesso!', {
            pdfSize: pdfBlob.size,
            pdfType: pdfBlob.type,
          })
        } catch (pdfError) {
          devLogger.error('❌ [handleConfirmSave] Erro ao gerar PDF:', pdfError)
          throw new Error(`Falha ao gerar PDF: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`)
        }
      }

      // Salvar evolução com documento
      devLogger.log('💾 [handleConfirmSave] Salvando no servidor...', {
        hasPdf: !!pdfBlob,
        hasDocument: !!clinicalNoteData.document,
      })

      try {
        if (pdfBlob) {
          devLogger.log('📤 [handleConfirmSave] Enviando com PDF via FormData...')
          await createClinicalNoteWithDocument(clinicalNoteData, pdfBlob)
        } else {
          devLogger.log('📤 [handleConfirmSave] Enviando sem PDF...')
          await createMutation.mutateAsync(clinicalNoteData)
        }

        devLogger.log('✅ [handleConfirmSave] Salvo com sucesso!')
        toast.success('Evolução e documento salvos com sucesso!')

        // Fechar modals e limpar estados
        setShowPreview(false)
        setPendingFormData(null)
        onOpenChange(false)
        onSuccess?.()
      } catch (saveError: unknown) {
        devLogger.error('❌ [handleConfirmSave] Erro ao salvar:', saveError)

        // Tratamento específico para erros de autenticação
        const errorResponse = (saveError as { response?: { status?: number }; message?: string }).response
        const errorMessage = (saveError as { message?: string }).message

        if (errorResponse?.status === 401 || errorResponse?.status === 403) {
          toast.error('Sessão expirada durante o salvamento. Por favor, faça login novamente.')
        } else {
          toast.error(`Erro ao salvar: ${errorMessage || 'Erro desconhecido'}`)
        }
        throw saveError
      }
    } catch (error: unknown) {
      devLogger.error('❌ [handleConfirmSave] Erro completo:', error)
      const errorWithStack = error as { stack?: string }
      devLogger.error('❌ [handleConfirmSave] Stack:', errorWithStack.stack)
    } finally {
      setIsConfirming(false)
    }
  }

  // Função para voltar a editar
  const handleBackToEdit = () => {
    setShowPreview(false)
    // Mantém os dados, usuário pode continuar editando
  }

  const professionConfig = getProfessionConfig(selectedProfession)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{professionConfig.icon}</span>
            {isEditing ? 'Editar Evolução Clínica' : 'Nova Evolução Clínica (SOAP)'}
          </DialogTitle>
          <DialogDescription>
            {residentName && `Residente: ${residentName} • `}
            Preencha ao menos um campo SOAP (S, O, A ou P)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profissão e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="profession">
                Profissão <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="profession"
                control={control}
                render={({ field }) => (
                  <>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isEditing || authorizationLoading || !!userProfession}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {authorizationLoading ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : availableProfessions.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            Nenhuma profissão autorizada
                          </div>
                        ) : (
                          Object.entries(PROFESSION_CONFIG)
                            .filter(([key]) => availableProfessions.includes(key as ClinicalProfession))
                            .map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2">
                                  <span>{config.icon}</span>
                                  <span>{config.label}</span>
                                </span>
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                    {userProfession && !isEditing && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Profissão selecionada automaticamente com base no seu cargo/registro profissional
                      </p>
                    )}
                  </>
                )}
              />
              {errors.profession && (
                <p className="text-sm text-destructive mt-1">
                  {errors.profession.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="noteDate">
                Data/Hora da Evolução <span className="text-destructive">*</span>
              </Label>
              <Input
                id="noteDate"
                type="datetime-local"
                {...register('noteDate')}
                disabled={isEditing} // Não pode mudar data ao editar
              />
              {errors.noteDate && (
                <p className="text-sm text-destructive mt-1">
                  {errors.noteDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Sinais Vitais Compacto */}
          {lastVitalSign && !vitalSignsLoading && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary/95">Último Monitoramento</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTimeSafe(lastVitalSign.timestamp)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertVitalSignsIntoObjective}
                  disabled={isLoading}
                  className="h-7 text-xs"
                >
                  Inserir no Objetivo
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {lastVitalSign.systolicBloodPressure && lastVitalSign.diastolicBloodPressure && (
                  <div className="bg-white rounded px-2 py-1 text-xs">
                    <span className="text-muted-foreground">PA:</span>{' '}
                    <span className="font-medium">
                      {lastVitalSign.systolicBloodPressure}/{lastVitalSign.diastolicBloodPressure}
                    </span>
                  </div>
                )}
                {lastVitalSign.heartRate && (
                  <div className="bg-white rounded px-2 py-1 text-xs">
                    <span className="text-muted-foreground">FC:</span>{' '}
                    <span className="font-medium">{lastVitalSign.heartRate} bpm</span>
                  </div>
                )}
                {lastVitalSign.temperature && (
                  <div className="bg-white rounded px-2 py-1 text-xs">
                    <span className="text-muted-foreground">Temp:</span>{' '}
                    <span className="font-medium">{lastVitalSign.temperature.toFixed(1)}°C</span>
                  </div>
                )}
                {lastVitalSign.oxygenSaturation && (
                  <div className="bg-white rounded px-2 py-1 text-xs">
                    <span className="text-muted-foreground">SpO2:</span>{' '}
                    <span className="font-medium">{lastVitalSign.oxygenSaturation}%</span>
                  </div>
                )}
                {lastVitalSign.bloodGlucose && (
                  <div className="bg-white rounded px-2 py-1 text-xs">
                    <span className="text-muted-foreground">Gli:</span>{' '}
                    <span className="font-medium">{lastVitalSign.bloodGlucose} mg/dL</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Campos SOAP com template dinâmico */}
          <div className={`rounded-lg border-2 p-4 ${professionConfig.borderColor} ${professionConfig.bgColor}`}>
            <h3 className={`font-semibold mb-4 ${professionConfig.color}`}>
              Método SOAP - {professionConfig.label}
            </h3>

            <SOAPTemplateFields
              profession={selectedProfession}
              subjective={subjective}
              objective={objective}
              assessment={assessment}
              plan={plan}
              onSubjectiveChange={(value) => setValue('subjective', value)}
              onObjectiveChange={(value) => setValue('objective', value)}
              onAssessmentChange={(value) => setValue('assessment', value)}
              onPlanChange={(value) => setValue('plan', value)}
              disabled={isLoading}
            />
          </div>

          {/* Documento Opcional */}
          {!isEditing && (
            <div>
              {documentTitle && documentContent ? (
                // Card compacto quando documento existe
                <div className="p-3 border-2 border-medication-controlled/30 bg-medication-controlled/5 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-medication-controlled shrink-0" />
                        <h4 className="font-medium text-medication-controlled/95 text-sm truncate">{documentTitle}</h4>
                        {documentType && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {documentType}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {documentContent.replace(/<[^>]*>/g, '')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(true)}
                        className="shrink-0 h-8 w-8 p-0"
                        title="Visualizar documento"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEditorModal(true)}
                        className="shrink-0 h-8 w-8 p-0"
                        title="Editar documento"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este documento?')) {
                            setDocumentTitle('')
                            setDocumentType('')
                            setDocumentContent('')
                            setDocumentEnabled(false)
                          }
                        }}
                        className="shrink-0 h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Excluir documento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // Botão compacto quando não há documento
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDocumentEnabled(true)
                    setShowEditorModal(true)
                  }}
                  className="w-full gap-2 text-medication-controlled/80 border-medication-controlled/30 hover:bg-medication-controlled/5"
                >
                  <FileText className="h-4 w-4" />
                  Adicionar Documento Formatado (opcional)
                </Button>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (opcional)</Label>
            <div className="flex gap-2">
              <Input
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="Digite uma tag customizada ou selecione abaixo"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag(customTagInput)
                  }
                }}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addTag(customTagInput)}
                disabled={isLoading || !customTagInput.trim()}
              >
                Adicionar
              </Button>
            </div>

            {/* Tags selecionadas */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
                {selectedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Tags sugeridas */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tags sugeridas:</p>
              <div className="flex flex-wrap gap-1">
                {allAvailableTags
                  .filter((tag) => !selectedTags.includes(tag))
                  .map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => addTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>

          {/* Motivo da edição (apenas se editing) */}
          {isEditing && (
            <div>
              <Label htmlFor="editReason">
                Motivo da Edição <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="editReason"
                {...register('editReason')}
                placeholder="Descreva o motivo desta edição (mínimo 10 caracteres)"
                className="min-h-[80px]"
                disabled={isLoading}
              />
              {errors.editReason && (
                <p className="text-sm text-destructive mt-1">
                  {errors.editReason.message}
                </p>
              )}
            </div>
          )}

          {/* Erro geral (ao menos 1 campo SOAP) */}
          {errors.subjective && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/30">
              {errors.subjective.message}
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Evolução'}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Modal de Preview do Documento */}
      {showPreview && (
        <DocumentPreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          documentTitle={documentTitle}
          documentContent={documentContent}
          resident={{
            fullName: residentData?.fullName || '',
            age: residentData?.birthDate
              ? new Date().getFullYear() - new Date(residentData.birthDate).getFullYear()
              : 0,
            cpf: residentData?.cpf || '',
            cns: residentData?.cns,
            admissionDate: residentData?.admissionDate,
          }}
          professional={professionalData}
          date={pendingFormData?.noteDate || new Date().toISOString()}
          documentId={undefined} // TODO: Gerar UUID ao criar documento
          institutionalData={
            profileData?.profile
              ? {
                  tenantName: profileData.tenant?.name,
                  logoUrl: profileData.profile.logoUrl || undefined,
                  cnpj: profileData.tenant?.cnpj || undefined,
                  cnesCode: profileData.profile.cnesCode || undefined,
                  phone: profileData.tenant?.phone || undefined,
                  email: profileData.tenant?.email || undefined,
                  addressStreet: profileData.tenant?.addressStreet || undefined,
                  addressNumber: profileData.tenant?.addressNumber || undefined,
                  addressDistrict: profileData.tenant?.addressDistrict || undefined,
                  addressCity: profileData.tenant?.addressCity || undefined,
                  addressState: profileData.tenant?.addressState || undefined,
                  addressZipCode: profileData.tenant?.addressZipCode || undefined,
                }
              : undefined
          }
          onConfirm={handleConfirmSave}
          onEdit={handleBackToEdit}
          isConfirming={isConfirming}
        />
      )}

      {/* Modal do Editor de Documentos (fullscreen) */}
      <DocumentEditorModal
        open={showEditorModal}
        onOpenChange={setShowEditorModal}
        documentTitle={documentTitle}
        documentType={documentType}
        documentContent={documentContent}
        onDocumentTitleChange={setDocumentTitle}
        onDocumentTypeChange={setDocumentType}
        onDocumentContentChange={setDocumentContent}
        onSave={() => {
          toast.success('Documento salvo! Será anexado à evolução.')
        }}
      />
    </Dialog>
  )
}
