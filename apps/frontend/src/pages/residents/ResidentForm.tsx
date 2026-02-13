// ──────────────────────────────────────────────────────────────────────────────
//  PAGE - Formulário de Residente (Split-View Layout)
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, FileText, Edit, History, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Page, PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '@/design-system/components'
import {
  getMensagemValidacaoCPF,
  getMensagemValidacaoCNS,
} from '@/utils/validators'
import { buscarCEP } from '@/services/viacep'
import {
  timestamptzToDisplay,
  displayToDate,
  mapEstadoCivilFromBackend,
  mapEstadoCivilToBackend,
} from '@/utils/formMappers'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import { uploadFile } from '@/services/upload'
import { ResidentHistoryDrawer } from '@/components/residents/ResidentHistoryDrawer'
import { toast } from 'sonner'
import { PlanLimitWarningDialog } from '@/components/admin/PlanLimitWarningDialog'
import type { Resident } from '@/api/residents.api'
import { tenantKey } from '@/lib/query-keys'
import { useMySubscription } from '@/hooks/useTenant'
import { useResident } from '@/hooks/useResidents'
import {
  FormSidebar,
  IdentificacaoSection,
  ContatosSection,
  EnderecoSection,
  ResponsavelSection,
  ConveniosSection,
  AdmissaoSection,
  DocumentosSection,
  getResidentSchema,
  type FormSection,
  type ResidentFormData,
  type CpfValidation,
  type CnsValidation,
} from '@/components/resident-form'

// ========== SECTION CONFIG ==========

const SECTION_CONFIG: Record<FormSection, { title: string; subtitle: string }> = {
  identificacao: { title: 'Identificação', subtitle: 'Dados pessoais e foto do residente' },
  contatos: { title: 'Contatos de Emergência', subtitle: 'Pessoas para contato em caso de emergência' },
  endereco: { title: 'Endereço', subtitle: 'Endereço atual e procedência' },
  responsavel: { title: 'Responsável Legal', subtitle: 'Dados do responsável pelo residente' },
  convenios: { title: 'Convênios', subtitle: 'Planos de saúde vinculados' },
  admissao: { title: 'Admissão e Acomodação', subtitle: 'Dados de admissão e leito' },
  documentos: { title: 'Documentos', subtitle: 'Documentos anexados ao prontuário' },
}

const getResidentStatusBadgeVariant = (
  status?: string
): 'success' | 'warning' | 'secondary' => {
  switch (status?.toUpperCase()) {
    case 'ATIVO':
      return 'success'
    case 'INATIVO':
      return 'warning'
    case 'FALECIDO':
    case 'OBITO':
    case 'ÓBITO':
      return 'secondary'
    default:
      return 'secondary'
  }
}

// ========== COMPONENT ==========

interface ResidentFormProps {
  readOnly?: boolean
}

export function ResidentForm({ readOnly = false }: ResidentFormProps = {}) {
  // Estados de navegação
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Estado da seção ativa
  const [activeSection, setActiveSection] = useState<FormSection>('identificacao')

  // Estados para modo edição
  const isEditMode = !!id
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | undefined>(undefined)
  const [photoChangeType, setPhotoChangeType] = useState<'unchanged' | 'removed' | 'new'>('unchanged')
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [residentFullName, setResidentFullName] = useState<string | undefined>(undefined)

  // Estados de validação
  const [cpfValidation, setCpfValidation] = useState<CpfValidation>({
    valido: true,
    mensagem: '',
  })
  const [cnsValidation, setCnsValidation] = useState<CnsValidation>({
    valido: true,
    mensagem: '',
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const [hasSeenWarning, setHasSeenWarning] = useState(false)

  // Ref para dados do residente
  const residentDataRef = useRef<Resident | null>(null)
  const residentLoadErrorShownRef = useRef(false)

  // Subscription data
  const { data: subscriptionData } = useMySubscription()
  const {
    data: loadedResident,
    isLoading: isResidentLoading,
    error: residentLoadError,
  } = useResident(id)
  const isLoading = !!id && isResidentLoading
  const hasResidentLoadError = !!id && !!residentLoadError && !loadedResident

  // Form setup
  const methods = useForm<ResidentFormData>({
    resolver: zodResolver(getResidentSchema(isEditMode)) as never,
    mode: 'onChange',
    defaultValues: {
      status: 'Ativo',
      leitoNumero: '',
      contatosEmergencia: [],
      convenios: [],
    },
  })

  const {
    watch,
    setValue,
    register,
    handleSubmit,
    formState: { errors },
  } = methods

  const watchCpf = watch('cpf')
  const watchCns = watch('cns')
  const watchDataNascimento = watch('dataNascimento')

  // Validação de CPF em tempo real
  useEffect(() => {
    if (watchCpf) {
      setCpfValidation(getMensagemValidacaoCPF(watchCpf))
    }
  }, [watchCpf])

  // Validação de CNS em tempo real
  useEffect(() => {
    if (watchCns) {
      setCnsValidation(getMensagemValidacaoCNS(watchCns))
    }
  }, [watchCns])

  // Calcula feedback de idade
  const getBirthDateFeedback = (): { message: string; isError: boolean } | null => {
    if (!watchDataNascimento || watchDataNascimento.length !== 10) {
      return { message: 'Critério etário: 60 anos ou mais (art. 2º, RDC nº 502/2021).', isError: false }
    }

    const [day, month, year] = watchDataNascimento.split('/').map(Number)
    if (!day || !month || !year || year < 1900) {
      return { message: 'Critério etário: 60 anos ou mais (art. 2º, RDC nº 502/2021).', isError: false }
    }

    const birthDate = new Date(year, month - 1, day)
    const today = new Date()

    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    const dayDiff = today.getDate() - birthDate.getDate()

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--
    }

    if (age < 60) {
      return {
        message: 'Residente deve ter idade igual ou superior a 60 anos (RDC 502/2021 Art. 2º)',
        isError: true,
      }
    }

    return { message: `✓ Idade: ${age} anos`, isError: false }
  }

  // Verificar limite ao entrar na página
  useEffect(() => {
    if (isEditMode || !subscriptionData || hasSeenWarning) return

    const { usage, plan } = subscriptionData
    const percentage = plan.maxResidents > 0 ? (usage.activeResidents / plan.maxResidents) * 100 : 0

    if (percentage >= 80) {
      setShowLimitDialog(true)
      setHasSeenWarning(true)
    }
  }, [subscriptionData, hasSeenWarning, isEditMode])

  useEffect(() => {
    residentLoadErrorShownRef.current = false
  }, [id])

  // ========== CARREGAR DADOS DO RESIDENTE (MODO EDIÇÃO) ==========
  useEffect(() => {
    if (!id || !loadedResident) return

    const resident = loadedResident as Resident & {
      email?: string
      origin?: string
    }
    setCurrentPhotoUrl(resident.fotoUrl || undefined)
    setPhotoChangeType('unchanged')

    // Dados Pessoais
    if (resident.fullName) {
      setValue('nome', resident.fullName)
      setResidentFullName(resident.fullName)
    }
    if (resident.socialName) setValue('nomeSocial', resident.socialName)
    if (resident.email) setValue('email', resident.email)
    if (resident.cns) setValue('cns', resident.cns)
    if (resident.cpf) setValue('cpf', resident.cpf)
    if (resident.rg) setValue('rg', resident.rg)
    if (resident.rgIssuer) setValue('orgaoExpedidor', resident.rgIssuer)
    if (resident.education) setValue('escolaridade', resident.education)
    if (resident.profession) setValue('profissao', resident.profession)
    if (resident.gender) setValue('genero', resident.gender)
    if (resident.civilStatus) setValue('estadoCivil', mapEstadoCivilFromBackend(resident.civilStatus))
    if (resident.religion) setValue('religiao', resident.religion)
    if (resident.birthDate) setValue('dataNascimento', timestamptzToDisplay(resident.birthDate))
    if (resident.nationality) setValue('nacionalidade', resident.nationality)
    if (resident.birthCity) setValue('naturalidade', resident.birthCity)
    if (resident.birthState) setValue('ufNascimento', resident.birthState)
    if (resident.motherName) setValue('nomeMae', resident.motherName)
    if (resident.fatherName) setValue('nomePai', resident.fatherName)
    if (resident.status) setValue('status', resident.status)

    // Endereço Atual
    if (resident.currentCep) setValue('cepAtual', resident.currentCep)
    if (resident.currentState) setValue('estadoAtual', resident.currentState)
    if (resident.currentCity) setValue('cidadeAtual', resident.currentCity)
    if (resident.currentStreet) setValue('logradouroAtual', resident.currentStreet)
    if (resident.currentNumber) setValue('numeroAtual', resident.currentNumber)
    if (resident.currentComplement) setValue('complementoAtual', resident.currentComplement)
    if (resident.currentDistrict) setValue('bairroAtual', resident.currentDistrict)
    if (resident.currentPhone) setValue('telefoneAtual', resident.currentPhone)

    // Procedência
    if (resident.origin) setValue('procedencia', resident.origin)

    // Contatos
    if (resident.emergencyContacts && Array.isArray(resident.emergencyContacts) && resident.emergencyContacts.length > 0) {
      const contatos = resident.emergencyContacts.map((contact: { name: string; phone: string; relationship: string }) => ({
        nome: contact.name,
        telefone: contact.phone,
        parentesco: contact.relationship,
      }))
      setValue('contatosEmergencia', contatos)
    }

    // Responsável Legal
    if (resident.legalGuardianName) setValue('responsavelLegalNome', resident.legalGuardianName)
    if (resident.legalGuardianEmail) setValue('responsavelLegalEmail', resident.legalGuardianEmail)
    if (resident.legalGuardianCpf) setValue('responsavelLegalCpf', resident.legalGuardianCpf)
    if (resident.legalGuardianRg) setValue('responsavelLegalRg', resident.legalGuardianRg)
    if (resident.legalGuardianPhone) setValue('responsavelLegalTelefone', resident.legalGuardianPhone)
    if (resident.legalGuardianType) setValue('responsavelLegalTipo', resident.legalGuardianType)
    if (resident.legalGuardianCep) setValue('responsavelLegalCep', resident.legalGuardianCep)
    if (resident.legalGuardianState) setValue('responsavelLegalUf', resident.legalGuardianState)
    if (resident.legalGuardianCity) setValue('responsavelLegalCidade', resident.legalGuardianCity)
    if (resident.legalGuardianStreet) setValue('responsavelLegalLogradouro', resident.legalGuardianStreet)
    if (resident.legalGuardianNumber) setValue('responsavelLegalNumero', resident.legalGuardianNumber)
    if (resident.legalGuardianComplement) setValue('responsavelLegalComplemento', resident.legalGuardianComplement)
    if (resident.legalGuardianDistrict) setValue('responsavelLegalBairro', resident.legalGuardianDistrict)

    // Convênios
    if (resident.healthPlans && Array.isArray(resident.healthPlans)) {
      const convenios = resident.healthPlans.map((plan: { name: string; cardNumber: string }) => ({
        nome: plan.name,
        numero: plan.cardNumber,
      }))
      setValue('convenios', convenios)
    }

    // Admissão
    if (resident.admissionDate) setValue('dataAdmissao', timestamptzToDisplay(resident.admissionDate))
    if (resident.admissionType) setValue('tipoAdmissao', resident.admissionType)
    if (resident.admissionReason) setValue('motivoAdmissao', resident.admissionReason)
    if (resident.admissionConditions) setValue('condicoesAdmissao', resident.admissionConditions)
    if (resident.dischargeDate) setValue('dataDesligamento', timestamptzToDisplay(resident.dischargeDate))
    if (resident.dischargeReason) setValue('motivoDesligamento', resident.dischargeReason)

    // Acomodação
    if (resident.bedId) setValue('leitoNumero', resident.bedId)

    residentDataRef.current = {
      roomId: resident.roomId,
      bedId: resident.bedId,
    } as Resident
  }, [id, loadedResident, setValue])

  useEffect(() => {
    if (!id || !residentLoadError || residentLoadErrorShownRef.current) return

    residentLoadErrorShownRef.current = true

    const error = residentLoadError as {
      response?: { data?: { message?: string } }
      message?: string
    }
    const message = error.response?.data?.message || error.message || 'Erro desconhecido'
    toast.error(`Erro ao carregar dados do residente: ${message}`)
  }, [id, residentLoadError])

  // Função para buscar CEP
  const handleBuscarCep = useCallback(
    async (cep: string, prefix: 'atual' | 'procedencia' | 'responsavelLegal') => {
      const cepLimpo = cep.replace(/\D/g, '')
      if (cepLimpo.length === 8) {
        const endereco = await buscarCEP(cepLimpo)
        if (endereco) {
          const fieldMapping = {
            atual: {
              estado: 'estadoAtual',
              cidade: 'cidadeAtual',
              logradouro: 'logradouroAtual',
              bairro: 'bairroAtual',
              complemento: 'complementoAtual',
            },
            procedencia: {
              estado: 'estadoProcedencia',
              cidade: 'cidadeProcedencia',
              logradouro: 'logradouroProcedencia',
              bairro: 'bairroProcedencia',
              complemento: 'complementoProcedencia',
            },
            responsavelLegal: {
              estado: 'responsavelLegalUf',
              cidade: 'responsavelLegalCidade',
              logradouro: 'responsavelLegalLogradouro',
              bairro: 'responsavelLegalBairro',
              complemento: 'responsavelLegalComplemento',
            },
          }
          const fields = fieldMapping[prefix]
          setValue(fields.estado as keyof ResidentFormData, endereco.estado)
          setValue(fields.cidade as keyof ResidentFormData, endereco.cidade)
          setValue(fields.logradouro as keyof ResidentFormData, endereco.logradouro)
          setValue(fields.bairro as keyof ResidentFormData, endereco.bairro)
          if (endereco.complemento) {
            setValue(fields.complemento as keyof ResidentFormData, endereco.complemento)
          }
        }
      }
    },
    [setValue]
  )

  // Handler para mudança de foto
  const handlePhotoChange = useCallback(
    (file: File | null, previewUrl?: string) => {
      setValue('foto', file)
      setCurrentPhotoUrl(previewUrl)
      setPhotoChangeType(file ? 'new' : 'removed')
    },
    [setValue]
  )

  // ========== SUBMIT ==========
  const onSubmit = async (data: ResidentFormData) => {
    try {
      setIsUploading(true)

      // Upload de arquivos
      let fotoUrl: string | undefined

      if (photoChangeType === 'new' && data.foto && data.foto instanceof File) {
        setUploadProgress('Enviando foto...')
        fotoUrl = await uploadFile(data.foto, 'photos')
      }

      setUploadProgress('Salvando residente...')

      // Transformar dados para o backend
      const payload: Record<string, unknown> = {
        fullName: data.nome,
        socialName: data.nomeSocial || null,
        email: data.email || null,
        cpf: data.cpf || null,
        rg: data.rg || null,
        rgIssuer: data.orgaoExpedidor || null,
        cns: data.cns || null,
        education: data.escolaridade || null,
        profession: data.profissao || null,
        gender: data.genero,
        civilStatus: data.estadoCivil ? mapEstadoCivilToBackend(data.estadoCivil) : null,
        religion: data.religiao || null,
        birthDate: displayToDate(data.dataNascimento),
        nationality: data.nacionalidade || null,
        birthCity: data.naturalidade || null,
        birthState: data.ufNascimento || null,
        motherName: data.nomeMae || null,
        fatherName: data.nomePai || null,

        // Endereço
        currentCep: data.cepAtual || null,
        currentState: data.estadoAtual || null,
        currentCity: data.cidadeAtual || null,
        currentStreet: data.logradouroAtual || null,
        currentNumber: data.numeroAtual || null,
        currentComplement: data.complementoAtual || null,
        currentDistrict: data.bairroAtual || null,
        currentPhone: data.telefoneAtual || null,
        origin: data.procedencia || null,

        // Contatos
        emergencyContacts: data.contatosEmergencia
          ?.filter((c) => c.nome || c.telefone)
          .map((c) => ({
            name: c.nome || '',
            phone: c.telefone || '',
            relationship: c.parentesco || '',
          })) || [],

        // Responsável Legal
        legalGuardianName: data.responsavelLegalNome || null,
        legalGuardianEmail: data.responsavelLegalEmail || null,
        legalGuardianCpf: data.responsavelLegalCpf || null,
        legalGuardianRg: data.responsavelLegalRg || null,
        legalGuardianPhone: data.responsavelLegalTelefone || null,
        legalGuardianType: data.responsavelLegalTipo || null,
        legalGuardianCep: data.responsavelLegalCep || null,
        legalGuardianState: data.responsavelLegalUf || null,
        legalGuardianCity: data.responsavelLegalCidade || null,
        legalGuardianStreet: data.responsavelLegalLogradouro || null,
        legalGuardianNumber: data.responsavelLegalNumero || null,
        legalGuardianComplement: data.responsavelLegalComplemento || null,
        legalGuardianDistrict: data.responsavelLegalBairro || null,

        // Convênios
        healthPlans: data.convenios
          ?.filter((c) => c.nome)
          .map((c) => ({
            name: c.nome || '',
            cardNumber: c.numero || '',
          })) || [],

        // Admissão
        admissionDate: displayToDate(data.dataAdmissao),
        admissionType: data.tipoAdmissao || null,
        admissionReason: data.motivoAdmissao || null,
        admissionConditions: data.condicoesAdmissao || null,
        dischargeDate: displayToDate(data.dataDesligamento),
        dischargeReason: data.motivoDesligamento || null,

        // Acomodação
        bedId: data.leitoNumero && data.leitoNumero.trim() ? data.leitoNumero.trim() : undefined,
      }

      if (photoChangeType === 'new' && fotoUrl) {
        payload.fotoUrl = fotoUrl
      } else if (isEditMode && photoChangeType === 'removed') {
        payload.fotoUrl = null
      }

      if (isEditMode) {
        if (data.status) payload.status = data.status
        payload.changeReason = data.changeReason
      }

      let response
      if (isEditMode) {
        setUploadProgress('Atualizando residente...')
        response = await api.patch(`/residents/${id}`, payload)
      } else {
        setUploadProgress('Criando residente...')
        response = await api.post('/residents', payload)
      }

      setIsUploading(false)
      setUploadProgress('')

      // Invalidar cache
      if (isEditMode && id) {
        queryClient.invalidateQueries({ queryKey: tenantKey('residents', id) })
        queryClient.invalidateQueries({ queryKey: tenantKey('residents', id, 'history') })
      }
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'list') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'stats') })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds') })

      toast.success(isEditMode ? 'Residente atualizado com sucesso!' : 'Residente criado com sucesso!')

      if (isEditMode) {
        navigate('/dashboard/residentes')
      } else {
        navigate('/dashboard/residentes', {
          state: {
            openDocumentsModal: true,
            residentId: response.data.id,
            residentName: response.data.fullName,
          },
        })
      }
    } catch (error: unknown) {
      let mensagem = 'Erro desconhecido'
      const err = error as { response?: { data?: { message?: string; error?: string }; status?: number }; message?: string }
      if (err.response?.data?.message) {
        mensagem = err.response.data.message
      } else if (err.response?.data?.error) {
        mensagem = err.response.data.error
      } else if (err.message) {
        mensagem = err.message
      }

      toast.error(`Erro ao salvar residente: ${mensagem}`)
      setIsUploading(false)
      setUploadProgress('')
    }
  }

  const handleCancel = () => {
    navigate('/dashboard/residentes')
  }

  const handleVoltar = () => {
    navigate('/dashboard/residentes')
  }

  // ========== RENDER SECTION CONTENT ==========
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'identificacao':
        return (
          <IdentificacaoSection
            currentPhotoUrl={currentPhotoUrl}
            onPhotoChange={handlePhotoChange}
            cpfValidation={cpfValidation}
            cnsValidation={cnsValidation}
            birthDateFeedback={getBirthDateFeedback()}
          />
        )
      case 'contatos':
        return <ContatosSection />
      case 'endereco':
        return <EnderecoSection onBuscarCep={handleBuscarCep} />
      case 'responsavel':
        return <ResponsavelSection onBuscarCep={handleBuscarCep} />
      case 'convenios':
        return <ConveniosSection />
      case 'admissao':
        return <AdmissaoSection readOnly={readOnly} />
      case 'documentos':
        return <DocumentosSection residentId={id} isNewResident={!id} />
      default:
        return null
    }
  }

  // ========== RENDER ==========
  return (
    <Page maxWidth="full">
      {/* Plan Limit Warning Dialog */}
      {subscriptionData && !isEditMode && (
        <PlanLimitWarningDialog
          type="residents"
          open={showLimitDialog}
          onOpenChange={setShowLimitDialog}
          onProceed={() => {}}
          usage={{
            current: subscriptionData.usage.activeResidents,
            max: subscriptionData.plan.maxResidents,
          }}
        />
      )}

      <PageHeader
        title={readOnly ? 'Visualizar Residente' : isEditMode ? 'Editar Residente' : 'Novo Residente'}
        subtitle={
          readOnly
            ? 'Visualização dos dados cadastrais do residente'
            : isEditMode
            ? 'Atualize as informações do residente'
            : 'Cadastre um novo residente na ILPI'
        }
        backButton={{ onClick: handleVoltar }}
        actions={
          <div className="flex gap-2">
            {readOnly ? (
              <>
                <Button onClick={() => navigate(`/dashboard/residentes/${id}`)} variant="default">
                  <FileText className="h-4 w-4 mr-2" />
                  Prontuário
                </Button>
                <Button onClick={() => setHistoryDrawerOpen(true)} variant="outline">
                  <History className="h-4 w-4 mr-2" />
                  Histórico
                </Button>
                <Button onClick={() => navigate(`/dashboard/residentes/${id}/edit`)} variant="default">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
                {isEditMode && id && (
                  <Button onClick={() => setHistoryDrawerOpen(true)} variant="outline" type="button">
                    <History className="h-4 w-4 mr-2" />
                    Histórico
                  </Button>
                )}
                <Button
                  type="submit"
                  form="resident-form"
                  disabled={isUploading || isLoading || hasResidentLoadError}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? 'Atualizando...' : 'Salvando...'}
                    </>
                  ) : isEditMode ? (
                    'Salvar Alterações'
                  ) : (
                    'Criar Residente'
                  )}
                </Button>
              </>
            )}
          </div>
        }
      />

      {hasResidentLoadError ? (
        <EmptyState
          icon={AlertCircle}
          title="Erro ao carregar residente"
          description="Não foi possível carregar os dados do residente para edição."
          variant="error"
          action={
            <Button variant="outline" onClick={() => navigate('/dashboard/residentes')}>
              Voltar para residentes
            </Button>
          }
        />
      ) : isLoading ? (
        <LoadingSpinner message="Carregando dados do residente..." />
      ) : (
        <FormProvider {...methods}>
          <form
            id="resident-form"
            onSubmit={handleSubmit(onSubmit, (errors) => {
              const firstError = Object.entries(errors)[0]
              if (firstError) {
                const [field, error] = firstError
                toast.error(`Erro no campo "${field}": ${(error as { message?: string }).message}`)
              }
            })}
          >
          {/* Status (modo edição) */}
          {isEditMode && !readOnly && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div>
                  <Label className="after:content-['*'] after:ml-0.5 after:text-danger block mb-3">
                    Status
                  </Label>
                  <div className="flex gap-2">
                    {(['Ativo', 'Inativo', 'Falecido'] as const).map((status) => (
                      <Button
                        key={status}
                        type="button"
                        variant={watch('status') === status ? (status === 'Ativo' ? 'success' : status === 'Inativo' ? 'warning' : 'danger') : 'outline'}
                        onClick={() => setValue('status', status)}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Motivo da Alteração (modo edição) */}
          {isEditMode && !readOnly && (
            <Card className="mb-6 border-warning">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Label htmlFor="changeReason" className="text-base font-semibold">
                    Motivo da Alteração <span className="text-danger">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Conforme RDC 502/2021 Art. 39, é obrigatório documentar o motivo de qualquer alteração no prontuário do residente.
                  </p>
                  <Textarea
                    id="changeReason"
                    placeholder="Ex: Atualização do endereço conforme solicitação da família..."
                    {...register('changeReason')}
                    className={cn('min-h-[100px]', errors.changeReason && 'border-danger focus:border-danger')}
                  />
                  {errors.changeReason && (
                    <p className="text-sm text-danger mt-2">{errors.changeReason.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Split-View Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 lg:items-start min-w-0">
            {/* Sidebar + Card Informativo */}
            <div className="space-y-4">
              <FormSidebar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                isNewResident={!id}
              />

              {/* Card Informativo - abaixo da navegação */}
              {!readOnly && (
                <Card className="bg-info/10 border-info/30">
                  <CardContent className="p-4">
                    <p className="text-xs text-info">
                      O preenchimento dos dados é exigido pelo <strong>Art. 33 da RDC 502/2021 (ANVISA)</strong> e pelo{' '}
                      <strong>Art. 50, XV do Estatuto da Pessoa Idosa</strong>.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Content */}
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="p-0 min-w-0">
                {/* Resident Header (edit/view mode) */}
                {isEditMode && residentFullName && (
                  <div className="px-6 py-4 bg-primary/10 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-primary">{residentFullName}</h2>
                      <StatusBadge variant={getResidentStatusBadgeVariant(watch('status'))}>
                        {watch('status') || 'Ativo'}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {SECTION_CONFIG[activeSection].title} • {SECTION_CONFIG[activeSection].subtitle}
                    </p>
                  </div>
                )}

                {/* Section Title (new resident mode) */}
                {!isEditMode && (
                  <div className="px-6 py-4 bg-primary/10 rounded-t-lg">
                    <h2 className="text-lg font-semibold text-primary">{SECTION_CONFIG[activeSection].title}</h2>
                    <p className="text-sm text-muted-foreground">{SECTION_CONFIG[activeSection].subtitle}</p>
                  </div>
                )}

                {/* Documentos sempre editável, outras seções respeitam readOnly */}
                <div className="p-6 min-w-0 overflow-x-auto">
                  {activeSection === 'documentos' ? (
                    renderSectionContent()
                  ) : (
                    <fieldset disabled={readOnly} className="min-w-0">
                      {renderSectionContent()}
                    </fieldset>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="text-center mt-6 p-4 bg-info/10 rounded-lg border border-info/30">
              <p className="text-info font-semibold">{uploadProgress}</p>
            </div>
          )}
          </form>
        </FormProvider>
      )}

      {/* Drawer de Histórico */}
      <ResidentHistoryDrawer
        residentId={id}
        residentName={residentFullName}
        open={historyDrawerOpen}
        onOpenChange={setHistoryDrawerOpen}
      />
    </Page>
  )
}

export default ResidentForm
