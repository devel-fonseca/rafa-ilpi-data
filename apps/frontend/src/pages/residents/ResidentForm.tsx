import React, { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, Plus, X, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { PhotoUpload } from '@/components/form/PhotoUpload'
import { MaskedInput } from '@/components/form/MaskedInput'
import { FileUpload } from '@/components/form/FileUpload'
import { validarCPF, getMensagemValidacaoCPF, getMensagemValidacaoCNS } from '@/utils/validators'
import { buscarCEP } from '@/services/viacep'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'
import { uploadFile, getSignedFileUrl } from '@/services/upload'

// Componente Collapsible customizado (inline)
interface CollapsibleProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  required?: boolean
}

function Collapsible({ title, children, defaultOpen = true, required = false }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
      <div
        className="bg-gray-50 px-5 py-4 font-semibold cursor-pointer flex justify-between items-center hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          {title}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
        <ChevronDown
          className={cn('w-5 h-5 transition-transform', isOpen ? '' : '-rotate-90')}
        />
      </div>
      {isOpen && <div className="p-5">{children}</div>}
    </div>
  )
}

// Schema Zod de validação
const residentSchema = z.object({
  // Status (opcional - apenas para modo edição)
  status: z.enum(['Ativo', 'Inativo', 'Falecido']).optional(),

  // Dados Pessoais
  foto: z.any().optional(),
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  nomeSocial: z.string().optional(),
  cns: z.string().optional(),
  cpf: z.string().refine((val) => validarCPF(val), 'CPF inválido'),
  rg: z.string().optional(),
  orgaoExpedidor: z.string().optional(),
  escolaridade: z.string().optional(),
  profissao: z.string().optional(),
  genero: z.enum(['MASCULINO', 'FEMININO', 'OUTRO']).refine((val) => val !== undefined, {
    message: 'Gênero é obrigatório'
  }),
  estadoCivil: z.string().optional(),
  religiao: z.string().optional(),
  dataNascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  nacionalidade: z.string().optional(),
  naturalidade: z.string().optional(),
  ufNascimento: z.string().optional(),
  nomeMae: z.string().optional(),
  nomePai: z.string().optional(),
  documentosPessoaisUrls: z.array(z.any()).optional(),
  cnsCard: z.any().optional(),

  // Endereço Atual
  cepAtual: z.string().optional(),
  estadoAtual: z.string().optional(),
  cidadeAtual: z.string().optional(),
  logradouroAtual: z.string().optional(),
  numeroAtual: z.string().optional(),
  complementoAtual: z.string().optional(),
  bairroAtual: z.string().optional(),
  telefoneAtual: z.string().optional(),

  // Endereço de Procedência
  endProcedenciaDiferente: z.boolean().optional(),
  cepProcedencia: z.string().optional(),
  estadoProcedencia: z.string().optional(),
  cidadeProcedencia: z.string().optional(),
  logradouroProcedencia: z.string().optional(),
  numeroProcedencia: z.string().optional(),
  complementoProcedencia: z.string().optional(),
  bairroProcedencia: z.string().optional(),
  telefoneProcedencia: z.string().optional(),
  documentosEnderecoUrls: z.array(z.any()).optional(),

  // Contatos
  contatosEmergencia: z.array(
    z.object({
      nome: z.string().optional(),
      telefone: z.string().optional(),
      parentesco: z.string().optional()
    })
  ).optional(),

  // Responsável Legal
  responsavelLegalNome: z.string().optional(),
  responsavelLegalCpf: z.string().optional(),
  responsavelLegalRg: z.string().optional(),
  responsavelLegalTelefone: z.string().optional(),
  responsavelLegalTipo: z.string().optional(),
  responsavelLegalCep: z.string().optional(),
  responsavelLegalUf: z.string().optional(),
  responsavelLegalCidade: z.string().optional(),
  responsavelLegalLogradouro: z.string().optional(),
  responsavelLegalNumero: z.string().optional(),
  responsavelLegalComplemento: z.string().optional(),
  responsavelLegalBairro: z.string().optional(),
  responsavelLegalDocumentosUrls: z.array(z.any()).optional(),

  // Admissão
  dataAdmissao: z.string().min(1, 'Data de admissão é obrigatória'),
  tipoAdmissao: z.string().optional(),
  motivoAdmissao: z.string().optional(),
  condicoesAdmissao: z.string().optional(),
  dataDesligamento: z.string().optional(),
  motivoDesligamento: z.string().optional(),
  termoAdmissao: z.any().optional(),
  consentimentoLgpd: z.any().optional(),
  consentimentoImagem: z.any().optional(),

  // Saúde
  necessidadesEspeciais: z.string().optional(),
  restricoesAlimentares: z.string().optional(),
  aspectosFuncionais: z.string().optional(),
  necessitaAuxilioMobilidade: z.boolean().optional(),
  situacaoSaude: z.string().optional(),
  tipoSanguineo: z.string().optional(),
  altura: z.string().optional(),
  peso: z.string().optional(),
  grauDependencia: z.string().optional(),
  medicamentosUso: z.string().optional(),
  alergias: z.string().optional(),
  condicoesCronicas: z.string().optional(),
  observacoesSaude: z.string().optional(),
  laudoMedico: z.any().optional(), // Arquivo
  laudoMedicoUrl: z.string().optional(), // URL retornada do backend
  dataLaudoMedico: z.string().optional(),

  // Convênios
  convenios: z.array(
    z.object({
      nome: z.string().optional(),
      numero: z.string().optional(),
      arquivo: z.any().optional()
    })
  ).optional(),

  // Pertences
  pertencesLista: z.string().optional(),

  // Acomodação
  quartoNumero: z.string().optional(),
  leitoNumero: z.string().optional()
})

type ResidentFormData = z.infer<typeof residentSchema>

export function ResidentForm() {
  // Estados para modo edição
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // Carregando dados do residente
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | undefined>(undefined)

  // Pegar tenantId do usuário logado
  const user = useAuthStore((state) => state.user)
  const tenantId = user?.tenantId

  // Estados gerais
  const [cpfValidation, setCpfValidation] = useState({ valido: true, mensagem: '' })
  const [cnsValidation, setCnsValidation] = useState({ valido: true, mensagem: '' })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ResidentFormData>({
    resolver: zodResolver(residentSchema),
    defaultValues: {
      contatosEmergencia: [{ nome: '', telefone: '', parentesco: '' }],
      convenios: [{ nome: '', numero: '' }],
      endProcedenciaDiferente: false,
      necessitaAuxilioMobilidade: false
    }
  })

  const { fields: contatosFields, append: appendContato, remove: removeContato } = useFieldArray({
    control,
    name: 'contatosEmergencia'
  })

  const { fields: conveniosFields, append: appendConvenio, remove: removeConvenio } = useFieldArray({
    control,
    name: 'convenios'
  })

  const watchEndProcedenciaDiferente = watch('endProcedenciaDiferente')
  const watchCpf = watch('cpf')
  const watchCns = watch('cns')

  // ========== FUNÇÕES DE CONVERSÃO DE DATA ==========
  /**
   * Converte data ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss.sssZ) para formato brasileiro DD/MM/YYYY
   * Usado para preencher campos de input quando carrega dados do backend
   */
  const convertISOToDisplayDate = useCallback((isoDate: string | null | undefined): string => {
    if (!isoDate) return ''
    try {
      // Extrai apenas a parte da data (YYYY-MM-DD)
      const datePart = isoDate.split('T')[0]
      const [year, month, day] = datePart.split('-')
      return `${day}/${month}/${year}`
    } catch (error) {
      console.error('Erro ao converter data ISO para display:', isoDate, error)
      return ''
    }
  }, [])

  /**
   * Mapeia estado civil do backend para o formato do frontend
   */
  const mapEstadoCivilFromBackend = useCallback((estadoCivil: string | null | undefined): string => {
    if (!estadoCivil) return ''
    const mapping: Record<string, string> = {
      'SOLTEIRO': 'solteiro',
      'CASADO': 'casado',
      'DIVORCIADO': 'divorciado',
      'VIUVO': 'viuvo',
      'UNIAO_ESTAVEL': 'uniao-estavel'
    }
    return mapping[estadoCivil] || estadoCivil.toLowerCase()
  }, [])

  // Validação de CPF em tempo real
  React.useEffect(() => {
    if (watchCpf) {
      setCpfValidation(getMensagemValidacaoCPF(watchCpf))
    }
  }, [watchCpf])

  // Validação de CNS em tempo real
  React.useEffect(() => {
    if (watchCns) {
      setCnsValidation(getMensagemValidacaoCNS(watchCns))
    }
  }, [watchCns])

  // ========== CARREGAR DADOS DO RESIDENTE (MODO EDIÇÃO) ==========
  useEffect(() => {
    const loadResident = async () => {
      if (!id) {
        setIsEditMode(false)
        return
      }

      setIsEditMode(true)
      setIsLoading(true)

      try {
        const response = await api.get(`/residents/${id}`)
        const resident = response.data

        console.log('🔍 DEBUG - Dados do residente carregados:', resident)

        // ===== FOTO =====
        if (resident.fotoUrl) {
          console.log('📷 DEBUG - fotoUrl do backend:', resident.fotoUrl)
          // Obter URL assinada (presigned URL) do backend para segurança LGPD
          try {
            const signedUrl = await getSignedFileUrl(resident.fotoUrl)
            console.log('📷 DEBUG - URL assinada obtida')
            setCurrentPhotoUrl(signedUrl)
          } catch (error) {
            console.error('❌ Erro ao obter URL da foto:', error)
            setCurrentPhotoUrl(undefined)
          }
        } else {
          console.log('⚠️ DEBUG - resident.fotoUrl é null/undefined')
        }

        // ===== DADOS PESSOAIS =====
        if (resident.fullName) setValue('nome', resident.fullName)
        if (resident.socialName) setValue('nomeSocial', resident.socialName)
        if (resident.cns) setValue('cns', resident.cns)
        if (resident.cpf) setValue('cpf', resident.cpf)
        if (resident.rg) setValue('rg', resident.rg)
        if (resident.rgIssuer) setValue('orgaoExpedidor', resident.rgIssuer)
        if (resident.education) setValue('escolaridade', resident.education)
        if (resident.profession) setValue('profissao', resident.profession)
        if (resident.gender) setValue('genero', resident.gender)
        if (resident.civilStatus) setValue('estadoCivil', mapEstadoCivilFromBackend(resident.civilStatus))
        if (resident.religion) setValue('religiao', resident.religion)
        if (resident.birthDate) setValue('dataNascimento', convertISOToDisplayDate(resident.birthDate))
        if (resident.nationality) setValue('nacionalidade', resident.nationality)
        if (resident.birthCity) setValue('naturalidade', resident.birthCity)
        if (resident.birthState) setValue('ufNascimento', resident.birthState)
        if (resident.motherName) setValue('nomeMae', resident.motherName)
        if (resident.fatherName) setValue('nomePai', resident.fatherName)
        if (resident.status) setValue('status', resident.status)

        // ===== ENDEREÇO ATUAL =====
        if (resident.currentCep) setValue('cepAtual', resident.currentCep)
        if (resident.currentState) setValue('estadoAtual', resident.currentState)
        if (resident.currentCity) setValue('cidadeAtual', resident.currentCity)
        if (resident.currentStreet) setValue('logradouroAtual', resident.currentStreet)
        if (resident.currentNumber) setValue('numeroAtual', resident.currentNumber)
        if (resident.currentComplement) setValue('complementoAtual', resident.currentComplement)
        if (resident.currentDistrict) setValue('bairroAtual', resident.currentDistrict)
        if (resident.currentPhone) setValue('telefoneAtual', resident.currentPhone)

        // ===== ENDEREÇO DE PROCEDÊNCIA =====
        if (resident.originCep) {
          setValue('endProcedenciaDiferente', true)
          setValue('cepProcedencia', resident.originCep)
          if (resident.originState) setValue('estadoProcedencia', resident.originState)
          if (resident.originCity) setValue('cidadeProcedencia', resident.originCity)
          if (resident.originStreet) setValue('logradouroProcedencia', resident.originStreet)
          if (resident.originNumber) setValue('numeroProcedencia', resident.originNumber)
          if (resident.originComplement) setValue('complementoProcedencia', resident.originComplement)
          if (resident.originDistrict) setValue('bairroProcedencia', resident.originDistrict)
        }

        // ===== CONTATOS =====
        if (resident.emergencyContacts && Array.isArray(resident.emergencyContacts) && resident.emergencyContacts.length > 0) {
          // Mapear emergencyContacts (inglês) para contatosEmergencia (português do form)
          const contatos = resident.emergencyContacts.map((contact: any) => ({
            nome: contact.name,
            telefone: contact.phone,
            parentesco: contact.relationship
          }))
          setValue('contatosEmergencia', contatos)
        }

        // ===== RESPONSÁVEL LEGAL =====
        if (resident.legalGuardianName) setValue('responsavelLegalNome', resident.legalGuardianName)
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

        // ===== SAÚDE =====
        if (resident.bloodType) setValue('tipoSanguineo', mapTipoSanguineoFromBackend(resident.bloodType))
        if (resident.height) setValue('altura', resident.height.toString())
        if (resident.weight) setValue('peso', resident.weight.toString())
        if (resident.allergies) setValue('alergias', resident.allergies)
        if (resident.medicationsOnAdmission) setValue('medicamentosUso', resident.medicationsOnAdmission)
        if (resident.chronicConditions) setValue('condicoesCronicas', resident.chronicConditions)
        if (resident.healthStatus) setValue('situacaoSaude', resident.healthStatus)
        if (resident.specialNeeds) setValue('necessidadesEspeciais', resident.specialNeeds)
        if (resident.functionalAspects) setValue('aspectosFuncionais', resident.functionalAspects)
        if (resident.dietaryRestrictions) setValue('restricoesAlimentares', resident.dietaryRestrictions)
        if (resident.dependencyLevel) setValue('grauDependencia', resident.dependencyLevel)

        // ===== MOBILIDADE =====
        if (resident.mobilityAid !== undefined) {
          setValue('necessitaAuxilioMobilidade', resident.mobilityAid)
        }

        // ===== CONVÊNIOS =====
        if (resident.healthPlans && Array.isArray(resident.healthPlans) && resident.healthPlans.length > 0) {
          // Mapear healthPlans (inglês) para convenios (português do form)
          const convenios = resident.healthPlans.map((plan: any) => ({
            nome: plan.name,
            numero: plan.cardNumber
          }))
          setValue('convenios', convenios)
        }

        // ===== PERTENCES =====
        if (resident.belongings && Array.isArray(resident.belongings) && resident.belongings.length > 0) {
          setValue('pertencesLista', resident.belongings.join('\n'))
        }

        // ===== ADMISSÃO/DESLIGAMENTO =====
        if (resident.admissionDate) setValue('dataAdmissao', convertISOToDisplayDate(resident.admissionDate))
        if (resident.admissionType) setValue('tipoAdmissao', resident.admissionType)
        if (resident.admissionReason) setValue('motivoAdmissao', resident.admissionReason)
        if (resident.admissionConditions) setValue('condicoesAdmissao', resident.admissionConditions)
        if (resident.dischargeDate) setValue('dataDesligamento', convertISOToDisplayDate(resident.dischargeDate))
        if (resident.dischargeReason) setValue('motivoDesligamento', resident.dischargeReason)

        // ===== ACOMODAÇÃO =====
        if (resident.roomId) setValue('quartoNumero', resident.roomId)
        if (resident.bedId) setValue('leitoNumero', resident.bedId)

        console.log('✅ Residente carregado com sucesso para edição:', resident.fullName)
      } catch (error: any) {
        console.error('❌ Erro ao carregar residente:', error)
        alert(`Erro ao carregar residente: ${error.response?.data?.message || error.message}`)
        navigate('/dashboard/residentes')
      } finally {
        setIsLoading(false)
      }
    }

    loadResident()
  }, [id, setValue, navigate, convertISOToDisplayDate, mapEstadoCivilFromBackend])

  // Buscar CEP - Endereço Atual
  const handleBuscarCepAtual = useCallback(async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length === 8) {
      const endereco = await buscarCEP(cepLimpo)
      if (endereco) {
        setValue('estadoAtual', endereco.estado)
        setValue('cidadeAtual', endereco.cidade)
        setValue('logradouroAtual', endereco.logradouro)
        setValue('bairroAtual', endereco.bairro)
        if (endereco.complemento) {
          setValue('complementoAtual', endereco.complemento)
        }
      }
    }
  }, [setValue])

  // Buscar CEP - Endereço de Procedência
  const handleBuscarCepProcedencia = useCallback(async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length === 8) {
      const endereco = await buscarCEP(cepLimpo)
      if (endereco) {
        setValue('estadoProcedencia', endereco.estado)
        setValue('cidadeProcedencia', endereco.cidade)
        setValue('logradouroProcedencia', endereco.logradouro)
        setValue('bairroProcedencia', endereco.bairro)
        if (endereco.complemento) {
          setValue('complementoProcedencia', endereco.complemento)
        }
      }
    }
  }, [setValue])

  // Buscar CEP - Responsável
  const handleBuscarCepResponsavel = useCallback(async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length === 8) {
      const endereco = await buscarCEP(cepLimpo)
      if (endereco) {
        setValue('responsavelLegalUf', endereco.estado)
        setValue('responsavelLegalCidade', endereco.cidade)
        setValue('responsavelLegalLogradouro', endereco.logradouro)
        setValue('responsavelLegalBairro', endereco.bairro)
        if (endereco.complemento) {
          setValue('responsavelLegalComplemento', endereco.complemento)
        }
      }
    }
  }, [setValue])

  // Função para converter DD/MM/YYYY para YYYY-MM-DD (ISO 8601)
  const convertToISODate = (dateStr: string | undefined): string | null => {
    if (!dateStr) return null
    const parts = dateStr.split('/')
    if (parts.length !== 3) return null
    const [day, month, year] = parts
    // Retornar formato ISO-8601 completo com hora (UTC)
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`
  }

  // Função para mapear estado civil para o formato do backend
  const mapEstadoCivil = (value: string | undefined): string | null => {
    if (!value) return null
    const map: Record<string, string> = {
      'Solteiro(a)': 'SOLTEIRO',
      'Casado(a)': 'CASADO',
      'Divorciado(a)': 'DIVORCIADO',
      'Viúvo(a)': 'VIUVO',
      'União Estável': 'UNIAO_ESTAVEL'
    }
    return map[value] || null
  }

  // Mapeamento de tipo sanguíneo: Formulário (A+, A-, etc.) → Backend (A_POSITIVO, A_NEGATIVO, etc.)
  const mapTipoSanguineo = (value: string | undefined): string => {
    if (!value) return 'NAO_INFORMADO'
    const map: Record<string, string> = {
      'A+': 'A_POSITIVO',
      'A-': 'A_NEGATIVO',
      'B+': 'B_POSITIVO',
      'B-': 'B_NEGATIVO',
      'AB+': 'AB_POSITIVO',
      'AB-': 'AB_NEGATIVO',
      'O+': 'O_POSITIVO',
      'O-': 'O_NEGATIVO'
    }
    return map[value] || 'NAO_INFORMADO'
  }

  // Mapeamento inverso: Backend → Formulário
  const mapTipoSanguineoFromBackend = (value: string | undefined): string => {
    if (!value || value === 'NAO_INFORMADO') return ''
    const map: Record<string, string> = {
      'A_POSITIVO': 'A+',
      'A_NEGATIVO': 'A-',
      'B_POSITIVO': 'B+',
      'B_NEGATIVO': 'B-',
      'AB_POSITIVO': 'AB+',
      'AB_NEGATIVO': 'AB-',
      'O_POSITIVO': 'O+',
      'O_NEGATIVO': 'O-'
    }
    return map[value] || ''
  }

  const onSubmit = async (data: ResidentFormData) => {
    try {
      console.log('Dados do formulário:', data)

      setIsUploading(true)

      // ========================================
      // FASE 1: Upload de arquivos para MinIO
      // ========================================
      let fotoUrl = null
      let documentosPessoaisUrls: string[] = []
      let documentosEnderecoUrls: string[] = []
      let documentosResponsavelUrls: string[] = []
      let laudoMedicoUrl = null
      let convenioArquivoUrl = null
      let cnsCardUrl = null
      let termoAdmissaoUrl = null
      let consentimentosUrls: string[] = []

      try {
        // Upload da foto
        if (data.foto && data.foto instanceof File) {
          setUploadProgress('Enviando foto...')
          fotoUrl = await uploadFile(data.foto, 'photos')
          console.log('Foto enviada:', fotoUrl)
        }

        // Upload de documentos pessoais (array)
        if (data.documentosPessoaisUrls && Array.isArray(data.documentosPessoaisUrls)) {
          setUploadProgress('Enviando documentos pessoais...')
          for (const file of data.documentosPessoaisUrls) {
            if (file instanceof File) {
              const url = await uploadFile(file, 'documents')
              documentosPessoaisUrls.push(url)
            }
          }
          console.log('Documentos pessoais enviados:', documentosPessoaisUrls)
        }

        // Upload de documentos de endereço (array)
        if (data.documentosEnderecoUrls && Array.isArray(data.documentosEnderecoUrls)) {
          setUploadProgress('Enviando documentos de endereço...')
          for (const file of data.documentosEnderecoUrls) {
            if (file instanceof File) {
              const url = await uploadFile(file, 'documents')
              documentosEnderecoUrls.push(url)
            }
          }
          console.log('Documentos de endereço enviados:', documentosEnderecoUrls)
        }

        // Upload de documentos do responsável (array)
        if (data.responsavelLegalDocumentosUrls && Array.isArray(data.responsavelLegalDocumentosUrls)) {
          setUploadProgress('Enviando documentos do responsável...')
          for (const file of data.responsavelLegalDocumentosUrls) {
            if (file instanceof File) {
              const url = await uploadFile(file, 'documents')
              documentosResponsavelUrls.push(url)
            }
          }
          console.log('Documentos do responsável enviados:', documentosResponsavelUrls)
        }

        // Upload de laudo médico
        if (data.laudoMedico && data.laudoMedico instanceof File) {
          setUploadProgress('Enviando laudo médico...')
          laudoMedicoUrl = await uploadFile(data.laudoMedico, 'medical')
          console.log('Laudo médico enviado:', laudoMedicoUrl)
        }

        // Upload de arquivo do convênio
        if (data.convenios?.[0]?.arquivo && data.convenios[0].arquivo instanceof File) {
          setUploadProgress('Enviando arquivo do convênio...')
          convenioArquivoUrl = await uploadFile(data.convenios[0].arquivo, 'documents')
          console.log('Arquivo do convênio enviado:', convenioArquivoUrl)
        }

        // Upload de CNS Card
        if (data.cnsCard && data.cnsCard instanceof File) {
          setUploadProgress('Enviando cartão CNS...')
          cnsCardUrl = await uploadFile(data.cnsCard, 'documents')
          console.log('CNS Card enviado:', cnsCardUrl)
        }

        // Upload de termo de admissão
        if (data.termoAdmissao && data.termoAdmissao instanceof File) {
          setUploadProgress('Enviando termo de admissão...')
          termoAdmissaoUrl = await uploadFile(data.termoAdmissao, 'documents')
          console.log('Termo de admissão enviado:', termoAdmissaoUrl)
        }

        // Upload de consentimento LGPD
        if (data.consentimentoLgpd && data.consentimentoLgpd instanceof File) {
          setUploadProgress('Enviando consentimento LGPD...')
          const url = await uploadFile(data.consentimentoLgpd, 'documents')
          consentimentosUrls.push(url)
          console.log('Consentimento LGPD enviado:', url)
        }

        // Upload de consentimento de imagem
        if (data.consentimentoImagem && data.consentimentoImagem instanceof File) {
          setUploadProgress('Enviando consentimento de imagem...')
          const url = await uploadFile(data.consentimentoImagem, 'documents')
          consentimentosUrls.push(url)
          console.log('Consentimento de imagem enviado:', url)
        }

        setUploadProgress('Uploads concluídos! Salvando residente...')
      } catch (uploadError: any) {
        console.error('Erro ao fazer upload:', uploadError)
        alert(`❌ Erro ao fazer upload dos arquivos: ${uploadError.message}`)
        setIsUploading(false)
        setUploadProgress('')
        return
      }

      // ========================================
      // FASE 2: Transformar dados para o backend
      // ========================================

      // Validar tenantId
      if (!tenantId) {
        console.error('❌ TenantId não encontrado')
        alert('Erro: Sessão inválida. Faça login novamente.')
        return
      }

      const payload: any = {
        tenantId, // OBRIGATÓRIO

        // 1. Dados Pessoais - NOMES EM INGLÊS (camelCase)
        fullName: data.nome,
        socialName: data.nomeSocial || null,
        cpf: data.cpf || null,
        rg: data.rg || null,
        rgIssuer: data.orgaoExpedidor || null,
        education: data.escolaridade || null,
        profession: data.profissao || null,
        cns: data.cns?.replace(/\s/g, '') || null,
        gender: data.genero || 'NAO_INFORMADO',
        civilStatus: mapEstadoCivil(data.estadoCivil),
        religion: data.religiao || null,
        birthDate: convertToISODate(data.dataNascimento),
        nationality: data.nacionalidade || 'Brasileira',
        birthCity: data.naturalidade || null,
        birthState: data.ufNascimento || null,
        motherName: data.nomeMae || null,
        fatherName: data.nomePai || null,
        // Só inclui fotoUrl se houver nova foto (evita sobrescrever foto existente)
        ...(fotoUrl ? { fotoUrl } : {}),
        // Só inclui documents se houver novos documentos (evita sobrescrever documentos existentes)
        ...(documentosPessoaisUrls.length > 0 ? { documents: documentosPessoaisUrls } : {}),

        // 2. Endereço Atual - NOMES EM INGLÊS
        currentCep: data.cepAtual || null,
        currentState: data.estadoAtual || null,
        currentCity: data.cidadeAtual || null,
        currentStreet: data.logradouroAtual || null,
        currentNumber: data.numeroAtual || null,
        currentComplement: data.complementoAtual || null,
        currentDistrict: data.bairroAtual || null,
        currentPhone: data.telefoneAtual || null,

        // Endereço de Procedência - NOMES EM INGLÊS
        originCep: data.cepProcedencia || null,
        originState: data.estadoProcedencia || null,
        originCity: data.cidadeProcedencia || null,
        originStreet: data.logradouroProcedencia || null,
        originNumber: data.numeroProcedencia || null,
        originComplement: data.complementoProcedencia || null,
        originDistrict: data.bairroProcedencia || null,
        originPhone: data.telefoneProcedencia || null,
        // Só inclui addressDocuments se houver novos documentos
        ...(documentosEnderecoUrls.length > 0 ? { addressDocuments: documentosEnderecoUrls } : {}),

        // 3. Contatos de Emergência - Array JSON
        emergencyContacts: (data.contatosEmergencia || [])
          .filter(c => c.nome || c.telefone || c.parentesco)
          .map(c => ({
            name: c.nome || '',
            phone: c.telefone || '',
            relationship: c.parentesco || ''
          })),

        // 4. Responsável Legal - NOMES EM INGLÊS
        legalGuardianName: data.responsavelLegalNome || null,
        legalGuardianCpf: data.responsavelLegalCpf || null,
        legalGuardianRg: data.responsavelLegalRg || null,
        legalGuardianPhone: data.responsavelLegalTelefone || null,
        legalGuardianType: data.responsavelLegalTipo && data.responsavelLegalTipo.trim() ? data.responsavelLegalTipo.toLowerCase() : undefined,
        legalGuardianCep: data.responsavelLegalCep || null,
        legalGuardianState: data.responsavelLegalUf || null,
        legalGuardianCity: data.responsavelLegalCidade || null,
        legalGuardianStreet: data.responsavelLegalLogradouro || null,
        legalGuardianNumber: data.responsavelLegalNumero || null,
        legalGuardianComplement: data.responsavelLegalComplemento || null,
        legalGuardianDistrict: data.responsavelLegalBairro || null,
        // Só inclui legalGuardianDocuments se houver novos documentos
        ...(documentosResponsavelUrls.length > 0 ? { legalGuardianDocuments: documentosResponsavelUrls } : {}),

        // 5. Admissão - NOMES EM INGLÊS
        admissionDate: convertToISODate(data.dataAdmissao),
        admissionType: data.tipoAdmissao && data.tipoAdmissao.trim() ? data.tipoAdmissao : undefined,
        admissionReason: data.motivoAdmissao || null,
        admissionConditions: data.condicoesAdmissao || null,
        dischargeDate: convertToISODate(data.dataDesligamento) || null,
        dischargeReason: data.motivoDesligamento || null,

        // 6. Saúde - NOMES EM INGLÊS
        healthStatus: data.situacaoSaude || null,
        bloodType: mapTipoSanguineo(data.tipoSanguineo),
        height: data.altura ? parseFloat(data.altura.replace(',', '.')) : null,
        weight: data.peso ? parseFloat(data.peso.replace(',', '.')) : null,
        dependencyLevel: data.grauDependencia || null,
        mobilityAid: data.necessitaAuxilioMobilidade || false,
        specialNeeds: data.necessidadesEspeciais || null,
        functionalAspects: data.aspectosFuncionais || null,
        medicationsOnAdmission: data.medicamentosUso || null,
        allergies: data.alergias || null,
        chronicConditions: data.condicoesCronicas || null,
        dietaryRestrictions: data.restricoesAlimentares || null,
        medicalReport: laudoMedicoUrl && data.dataLaudoMedico
          ? [{
              url: laudoMedicoUrl,
              date: convertToISODate(data.dataLaudoMedico)
            }]
          : [],

        // 7. Convênios/Planos de Saúde - Array JSON
        healthPlans: (data.convenios || [])
          .filter(c => c.nome || c.numero)
          .map((c, index) => ({
            name: c.nome || '',
            cardNumber: c.numero || null,
            cardUrl: index === 0 && convenioArquivoUrl ? convenioArquivoUrl : null
          })),

        // 8. Pertences - Array de strings
        belongings: data.pertencesLista
          ? data.pertencesLista.split('\n').filter(p => p.trim())
          : [],

        // 9. Acomodação - NOMES EM INGLÊS
        roomId: data.quartoNumero || null,
        bedId: data.leitoNumero || null,

      }

      // ========================================
      // Em modo edição, adicionar status se foi alterado
      // ========================================
      if (isEditMode && data.status) {
        payload.status = data.status
      }

      console.log('Payload para API:', payload)

      // ========================================
      // FASE 3: Enviar para backend (POST ou PATCH)
      // ========================================
      let response

      if (isEditMode) {
        // MODO EDIÇÃO: PATCH /residents/:id
        setUploadProgress('Atualizando residente...')
        response = await api.patch(`/residents/${id}`, payload)
        console.log('Residente atualizado:', response.data)
      } else {
        // MODO CRIAÇÃO: POST /residents
        setUploadProgress('Criando residente...')
        response = await api.post('/residents', payload)
        console.log('Residente criado:', response.data)
      }

      setIsUploading(false)
      setUploadProgress('')

      // Invalidar cache do React Query para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['residents'] })

      alert(isEditMode ? '✅ Residente atualizado com sucesso!' : '✅ Residente criado com sucesso!')

      // Redirecionar para lista
      navigate('/dashboard/residentes')

    } catch (error: any) {
      console.error('Erro ao salvar residente:', error)
      const mensagem = error.response?.data?.message || error.message || 'Erro desconhecido'
      alert(`❌ Erro ao salvar residente: ${mensagem}`)
      setIsUploading(false)
      setUploadProgress('')
    }
  }

  const handleReset = () => {
    window.location.reload()
  }

  const handleVoltar = () => {
    window.location.href = '/dashboard/residentes'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Editar Residente' : 'Novo Residente'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditMode
              ? 'Atualize as informações do residente'
              : 'Cadastre um novo residente na ILPI'
            }
          </p>
        </div>
        <Button
          onClick={handleVoltar}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Loading State durante carregamento de dados */}
      {isLoading && (
        <div className="text-center p-8 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-700 font-semibold">Carregando dados do residente...</p>
        </div>
      )}

      {/* Status (apenas em modo edição) */}
      {isEditMode && (
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <div className="max-w-xs">
              <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                Status
              </Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                      <SelectItem value="Falecido">Falecido</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className="text-sm text-red-500 mt-1">{errors.status.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs/Abas */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs defaultValue="tab1" className="mb-8">
            <TabsList className="grid grid-cols-9 gap-2 h-auto p-2 bg-white rounded-lg shadow-md mb-6">
              <TabsTrigger value="tab1" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4361ee] data-[state=active]:to-[#3f37c9] data-[state=active]:text-white">
                1. Dados
              </TabsTrigger>
              <TabsTrigger value="tab2" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4361ee] data-[state=active]:to-[#3f37c9] data-[state=active]:text-white">
                2. Endereços
              </TabsTrigger>
              <TabsTrigger value="tab3" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4361ee] data-[state=active]:to-[#3f37c9] data-[state=active]:text-white">
                3. Contatos
              </TabsTrigger>
              <TabsTrigger value="tab4" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4361ee] data-[state=active]:to-[#3f37c9] data-[state=active]:text-white">
                4. Responsável
              </TabsTrigger>
              <TabsTrigger value="tab5" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4361ee] data-[state=active]:to-[#3f37c9] data-[state=active]:text-white">
                5. Admissão
              </TabsTrigger>
              <TabsTrigger value="tab6" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4361ee] data-[state=active]:to-[#3f37c9] data-[state=active]:text-white">
                6. Saúde
              </TabsTrigger>
              <TabsTrigger value="tab7" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4361ee] data-[state=active]:to-[#3f37c9] data-[state=active]:text-white">
                7. Convênios
              </TabsTrigger>
              <TabsTrigger value="tab8" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4361ee] data-[state=active]:to-[#3f37c9] data-[state=active]:text-white">
                8. Pertences
              </TabsTrigger>
              <TabsTrigger value="tab9" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4361ee] data-[state=active]:to-[#3f37c9] data-[state=active]:text-white">
                9. Acomodação
              </TabsTrigger>
            </TabsList>

            {/* Aba 1 - Dados Pessoais */}
            <TabsContent value="tab1">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <Collapsible title="Informações Básicas" defaultOpen={true}>
                    <div className="grid grid-cols-12 gap-4">
                      {/* Foto */}
                      <div className="col-span-12 md:col-span-3">
                        <Label>Foto 3x4</Label>
                        <div className="mt-2">
                          <PhotoUpload
                            onPhotoSelected={(file) => setValue('foto', file)}
                            currentPhoto={currentPhotoUrl}
                          />
                        </div>
                      </div>

                      {/* Campos à direita da foto */}
                      <div className="col-span-12 md:col-span-9">
                        <div className="grid gap-4">
                          <div>
                            <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                              Nome completo
                            </Label>
                            <Input {...register('nome')} className="mt-2" />
                            {errors.nome && (
                              <p className="text-sm text-red-500 mt-1">{errors.nome.message}</p>
                            )}
                          </div>
                          <div>
                            <Label>Nome social</Label>
                            <Input {...register('nomeSocial')} className="mt-2" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>CNS</Label>
                              <Controller
                                name="cns"
                                control={control}
                                render={({ field }) => (
                                  <MaskedInput
                                    mask="999 9999 9999 9999"
                                    value={field.value}
                                    onChange={field.onChange}
                                    validation={cnsValidation}
                                    className="mt-2"
                                  />
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Outros campos */}
                      <div className="col-span-12 md:col-span-4">
                        <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                          CPF
                        </Label>
                        <Controller
                          name="cpf"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="999.999.999-99"
                              value={field.value}
                              onChange={field.onChange}
                              validation={cpfValidation}
                              className="mt-2"
                            />
                          )}
                        />
                        {errors.cpf && (
                          <p className="text-sm text-red-500 mt-1">{errors.cpf.message}</p>
                        )}
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label>RG</Label>
                        <Controller
                          name="rg"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="99.999.999-9"
                              value={field.value}
                              onChange={field.onChange}
                              className="mt-2"
                            />
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label>Órgão Expedidor</Label>
                        <Input {...register('orgaoExpedidor')} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>Escolaridade</Label>
                        <Input {...register('escolaridade')} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>Profissão</Label>
                        <Input {...register('profissao')} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                          Gênero
                        </Label>
                        <Controller
                          name="genero"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MASCULINO">Masculino</SelectItem>
                                <SelectItem value="FEMININO">Feminino</SelectItem>
                                <SelectItem value="OUTRO">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.genero && (
                          <p className="text-sm text-red-500 mt-1">{errors.genero.message}</p>
                        )}
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>Estado Civil</Label>
                        <Controller
                          name="estadoCivil"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                <SelectItem value="União Estável">União Estável</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label>Religião</Label>
                        <Input {...register('religiao')} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                          Data de Nascimento
                        </Label>
                        <Controller
                          name="dataNascimento"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="99/99/9999"
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="DD/MM/AAAA"
                              className="mt-2"
                            />
                          )}
                        />
                        {errors.dataNascimento && (
                          <p className="text-sm text-red-500 mt-1">{errors.dataNascimento.message}</p>
                        )}
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label>Nacionalidade</Label>
                        <Input {...register('nacionalidade')} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-5">
                        <Label>Local de Nascimento</Label>
                        <Input {...register('naturalidade')} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>UF</Label>
                        <Input
                          {...register('ufNascimento')}
                          maxLength={2}
                          className="mt-2 uppercase"
                          onChange={(e) => {
                            e.target.value = e.target.value.toUpperCase()
                            register('ufNascimento').onChange(e)
                          }}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-6">
                        <Label>Nome da Mãe</Label>
                        <Input {...register('nomeMae')} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-6">
                        <Label>Nome do Pai</Label>
                        <Input {...register('nomePai')} className="mt-2" />
                      </div>
                    </div>
                  </Collapsible>

                  <Collapsible title="Documentos" defaultOpen={false}>
                    <div className="space-y-4">
                      <div>
                        <Label>Documentos Pessoais (RG, CPF)</Label>
                        <FileUpload
                          onFilesSelected={(files) => setValue('documentosPessoaisUrls', files)}
                          title="Clique ou arraste documentos"
                          description="RG, CPF, comprovante..."
                        />
                      </div>
                      <div>
                        <Label>Cartão CNS</Label>
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) setValue('cnsCard', file)
                          }}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </Collapsible>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 2 - Endereços */}
            <TabsContent value="tab2">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <Collapsible title="Endereço Atual" defaultOpen={true}>
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-12 md:col-span-3">
                        <Label>CEP</Label>
                        <Controller
                          name="cepAtual"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="99999-999"
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(e)
                                handleBuscarCepAtual(e.target.value)
                              }}
                              className="mt-2"
                            />
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-2">
                        <Label>UF</Label>
                        <Input
                          {...register('estadoAtual')}
                          maxLength={2}
                          className="mt-2 uppercase"
                          onChange={(e) => {
                            e.target.value = e.target.value.toUpperCase()
                            register('estadoAtual').onChange(e)
                          }}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-7">
                        <Label>Cidade</Label>
                        <Input {...register('cidadeAtual')} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-6">
                        <Label>Logradouro</Label>
                        <Input {...register('logradouroAtual')} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-2">
                        <Label>Número</Label>
                        <Input {...register('numeroAtual')} placeholder="S/N" className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label>Complemento</Label>
                        <Input {...register('complementoAtual')} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-5">
                        <Label>Bairro</Label>
                        <Input {...register('bairroAtual')} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>Telefone</Label>
                        <Controller
                          name="telefoneAtual"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="(99) 99999-9999"
                              value={field.value}
                              onChange={field.onChange}
                              className="mt-2"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </Collapsible>

                  <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
                    <div className="bg-gray-50 px-5 py-4 font-semibold flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span>Endereço de Procedência</span>
                        <div className="flex items-center gap-2">
                          <Controller
                            name="endProcedenciaDiferente"
                            control={control}
                            render={({ field }) => (
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                id="endProcedenciaDiferente"
                              />
                            )}
                          />
                          <Label htmlFor="endProcedenciaDiferente" className="font-normal cursor-pointer">
                            Diferente do atual
                          </Label>
                        </div>
                      </div>
                    </div>
                    {watchEndProcedenciaDiferente && (
                      <div className="p-5">
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-12 md:col-span-3">
                            <Label>CEP</Label>
                            <Controller
                              name="cepProcedencia"
                              control={control}
                              render={({ field }) => (
                                <MaskedInput
                                  mask="99999-999"
                                  value={field.value}
                                  onChange={(e) => {
                                    field.onChange(e)
                                    handleBuscarCepProcedencia(e.target.value)
                                  }}
                                  className="mt-2"
                                />
                              )}
                            />
                          </div>

                          <div className="col-span-12 md:col-span-2">
                            <Label>UF</Label>
                            <Input
                              {...register('estadoProcedencia')}
                              maxLength={2}
                              className="mt-2 uppercase"
                              onChange={(e) => {
                                e.target.value = e.target.value.toUpperCase()
                                register('estadoProcedencia').onChange(e)
                              }}
                            />
                          </div>

                          <div className="col-span-12 md:col-span-7">
                            <Label>Cidade</Label>
                            <Input {...register('cidadeProcedencia')} className="mt-2" />
                          </div>

                          <div className="col-span-12 md:col-span-6">
                            <Label>Logradouro</Label>
                            <Input {...register('logradouroProcedencia')} className="mt-2" />
                          </div>

                          <div className="col-span-12 md:col-span-2">
                            <Label>Número</Label>
                            <Input {...register('numeroProcedencia')} placeholder="S/N" className="mt-2" />
                          </div>

                          <div className="col-span-12 md:col-span-4">
                            <Label>Complemento</Label>
                            <Input {...register('complementoProcedencia')} className="mt-2" />
                          </div>

                          <div className="col-span-12 md:col-span-5">
                            <Label>Bairro</Label>
                            <Input {...register('bairroProcedencia')} className="mt-2" />
                          </div>

                          <div className="col-span-12 md:col-span-3">
                            <Label>Telefone</Label>
                            <Controller
                              name="telefoneProcedencia"
                              control={control}
                              render={({ field }) => (
                                <MaskedInput
                                  mask="(99) 99999-9999"
                                  value={field.value}
                                  onChange={field.onChange}
                                  className="mt-2"
                                />
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Collapsible title="Documentos" defaultOpen={false}>
                    <FileUpload
                      onFilesSelected={(files) => setValue('documentosEnderecoUrls', files)}
                      title="Comprovante de residência"
                      description="PDF, imagens, etc."
                    />
                  </Collapsible>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 3 - Contatos */}
            <TabsContent value="tab3">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-3 mb-4">
                    {contatosFields.map((field, index) => (
                      <div key={field.id} className="flex gap-3 items-end p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <Label className="text-xs">Nome completo</Label>
                          <Input {...register(`contatosEmergencia.${index}.nome`)} className="mt-1" />
                        </div>
                        <div style={{ width: '180px' }}>
                          <Label className="text-xs">Telefone</Label>
                          <Controller
                            name={`contatosEmergencia.${index}.telefone`}
                            control={control}
                            render={({ field }) => (
                              <MaskedInput
                                mask="(99) 99999-9999"
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="(99) 99999-9999"
                                className="mt-1"
                              />
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">Parentesco</Label>
                          <Input {...register(`contatosEmergencia.${index}.parentesco`)} className="mt-1" />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeContato(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendContato({ nome: '', telefone: '', parentesco: '' })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Contato
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 4 - Responsável */}
            <TabsContent value="tab4">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="grid grid-cols-12 gap-4 mb-6">
                    <div className="col-span-12 md:col-span-6">
                      <Label>Nome Completo</Label>
                      <Input {...register('responsavelLegalNome')} className="mt-2" />
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <Label>CPF</Label>
                      <Controller
                        name="responsavelLegalCpf"
                        control={control}
                        render={({ field }) => (
                          <MaskedInput
                            mask="999.999.999-99"
                            value={field.value}
                            onChange={field.onChange}
                            className="mt-2"
                          />
                        )}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <Label>RG</Label>
                      <Controller
                        name="responsavelLegalRg"
                        control={control}
                        render={({ field }) => (
                          <MaskedInput
                            mask="99.999.999-9"
                            value={field.value}
                            onChange={field.onChange}
                            className="mt-2"
                          />
                        )}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <Label>Telefone</Label>
                      <Controller
                        name="responsavelLegalTelefone"
                        control={control}
                        render={({ field }) => (
                          <MaskedInput
                            mask="(99) 99999-9999"
                            value={field.value}
                            onChange={field.onChange}
                            className="mt-2"
                          />
                        )}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-9">
                      <Label>Tipo de Responsabilidade</Label>
                      <Controller
                        name="responsavelLegalTipo"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Curador">Curador</SelectItem>
                              <SelectItem value="Procurador">Procurador</SelectItem>
                              <SelectItem value="Responsável Familiar (Convencional)">Responsável Familiar (Convencional)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <hr className="my-6" />
                  <h3 className="text-lg font-semibold mb-4">Endereço do Responsável</h3>

                  <div className="grid grid-cols-12 gap-4 mb-6">
                    <div className="col-span-12 md:col-span-3">
                      <Label>CEP</Label>
                      <Controller
                        name="responsavelLegalCep"
                        control={control}
                        render={({ field }) => (
                          <MaskedInput
                            mask="99999-999"
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e)
                              handleBuscarCepResponsavel(e.target.value)
                            }}
                            className="mt-2"
                          />
                        )}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-2">
                      <Label>UF</Label>
                      <Input
                        {...register('responsavelLegalUf')}
                        maxLength={2}
                        className="mt-2 uppercase"
                        onChange={(e) => {
                          e.target.value = e.target.value.toUpperCase()
                          register('responsavelLegalUf').onChange(e)
                        }}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-7">
                      <Label>Cidade</Label>
                      <Input {...register('responsavelLegalCidade')} className="mt-2" />
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <Label>Logradouro</Label>
                      <Input {...register('responsavelLegalLogradouro')} className="mt-2" />
                    </div>

                    <div className="col-span-12 md:col-span-2">
                      <Label>Número</Label>
                      <Input {...register('responsavelLegalNumero')} className="mt-2" />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <Label>Complemento</Label>
                      <Input {...register('responsavelLegalComplemento')} className="mt-2" />
                    </div>

                    <div className="col-span-12">
                      <Label>Bairro</Label>
                      <Input {...register('responsavelLegalBairro')} className="mt-2" />
                    </div>
                  </div>

                  <FileUpload
                    onFilesSelected={(files) => setValue('responsavelLegalDocumentosUrls', files)}
                    title="Documentos do Responsável"
                    description="PDF, imagens, etc."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 5 - Admissão */}
            <TabsContent value="tab5">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-3">
                      <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                        Data de Admissão
                      </Label>
                      <Controller
                        name="dataAdmissao"
                        control={control}
                        render={({ field }) => (
                          <MaskedInput
                            mask="99/99/9999"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="DD/MM/AAAA"
                            className="mt-2"
                          />
                        )}
                      />
                      {errors.dataAdmissao && (
                        <p className="text-sm text-red-500 mt-1">{errors.dataAdmissao.message}</p>
                      )}
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <Label>Tipo de Admissão</Label>
                      <Controller
                        name="tipoAdmissao"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Voluntária">Voluntária</SelectItem>
                              <SelectItem value="Involuntária">Involuntária</SelectItem>
                              <SelectItem value="Judicial">Judicial</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-5">
                      <Label>Motivo da Admissão</Label>
                      <Input {...register('motivoAdmissao')} className="mt-2" />
                    </div>

                    <div className="col-span-12">
                      <Label>Condições de Admissão</Label>
                      <Textarea {...register('condicoesAdmissao')} rows={2} className="mt-2" />
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <Label>Data de Desligamento</Label>
                      <Controller
                        name="dataDesligamento"
                        control={control}
                        render={({ field }) => (
                          <MaskedInput
                            mask="99/99/9999"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="DD/MM/AAAA"
                            className="mt-2"
                          />
                        )}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-9">
                      <Label>Motivo do Desligamento</Label>
                      <Input {...register('motivoDesligamento')} className="mt-2" />
                    </div>

                    <div className="col-span-12">
                      <hr className="my-4" />
                      <h4 className="font-semibold text-gray-700 mb-4">Documentos de Admissão</h4>
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <Label>Termo de Admissão</Label>
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) setValue('termoAdmissao', file)
                        }}
                        className="mt-2"
                      />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <Label>Consentimento LGPD</Label>
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) setValue('consentimentoLgpd', file)
                        }}
                        className="mt-2"
                      />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <Label>Consentimento de Imagem</Label>
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) setValue('consentimentoImagem', file)
                        }}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 6 - Saúde */}
            <TabsContent value="tab6">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <Collapsible title="Necessidades Especiais" defaultOpen={true}>
                    <Textarea
                      {...register('necessidadesEspeciais')}
                      rows={3}
                      placeholder="Ex: Cadeirante, uso de sonda, colostomia, dependência total para AVDs..."
                    />
                    {errors.necessidadesEspeciais && (
                      <p className="text-sm text-red-500 mt-1">{errors.necessidadesEspeciais.message}</p>
                    )}
                  </Collapsible>

                  <Collapsible title="Restrições Alimentares" defaultOpen={true}>
                    <Textarea
                      {...register('restricoesAlimentares')}
                      rows={3}
                      placeholder="Ex: Sem lactose, hipossódico, diabético..."
                    />
                    {errors.restricoesAlimentares && (
                      <p className="text-sm text-red-500 mt-1">{errors.restricoesAlimentares.message}</p>
                    )}
                  </Collapsible>

                  <Collapsible title="Aspectos Funcionais" defaultOpen={true}>
                    <Textarea
                      {...register('aspectosFuncionais')}
                      rows={3}
                      placeholder="Ex: Independente para AVDs, necessita auxílio para banho e vestuário..."
                    />
                    {errors.aspectosFuncionais && (
                      <p className="text-sm text-red-500 mt-1">{errors.aspectosFuncionais.message}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Controller
                        name="necessitaAuxilioMobilidade"
                        control={control}
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="necessitaAuxilioMobilidade"
                          />
                        )}
                      />
                      <Label htmlFor="necessitaAuxilioMobilidade" className="font-normal cursor-pointer">
                        Necessita auxílio para mobilidade
                      </Label>
                    </div>
                  </Collapsible>

                  <Collapsible title="Outros" defaultOpen={false}>
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-12">
                        <Label>Situação de Saúde</Label>
                        <Textarea {...register('situacaoSaude')} rows={2} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-2">
                        <Label>Tipo Sanguíneo</Label>
                        <Controller
                          name="tipoSanguineo"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A+">A+</SelectItem>
                                <SelectItem value="A-">A-</SelectItem>
                                <SelectItem value="B+">B+</SelectItem>
                                <SelectItem value="B-">B-</SelectItem>
                                <SelectItem value="AB+">AB+</SelectItem>
                                <SelectItem value="AB-">AB-</SelectItem>
                                <SelectItem value="O+">O+</SelectItem>
                                <SelectItem value="O-">O-</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-2">
                        <Label>Altura (m)</Label>
                        <Input {...register('altura')} placeholder="1,75" className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-2">
                        <Label>Peso (kg)</Label>
                        <Input {...register('peso')} placeholder="70,5" className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>Grau de Dependência</Label>
                        <Controller
                          name="grauDependencia"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Grau I - Independente">Grau I - Independente</SelectItem>
                                <SelectItem value="Grau II - Semi Independente">Grau II - Semi Independente</SelectItem>
                                <SelectItem value="Grau III - Dependente total">Grau III - Dependente total</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="col-span-12">
                        <Label>Medicamentos</Label>
                        <Textarea {...register('medicamentosUso')} rows={2} className="mt-2" />
                      </div>

                      <div className="col-span-12">
                        <Label>Alergias</Label>
                        <Textarea {...register('alergias')} rows={2} className="mt-2" />
                      </div>

                      <div className="col-span-12">
                        <Label>Condições Crônicas</Label>
                        <Textarea {...register('condicoesCronicas')} rows={2} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-8">
                        <Label>Laudo Médico (arquivo)</Label>
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setValue('laudoMedicoUrl', file.name)
                            }
                          }}
                          className="mt-2"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label>Data do Laudo</Label>
                        <Controller
                          name="dataLaudoMedico"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="99/99/9999"
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="DD/MM/AAAA"
                              className="mt-2"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </Collapsible>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 7 - Convênios */}
            <TabsContent value="tab7">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-3 mb-4">
                    {conveniosFields.map((field, index) => (
                      <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-12 md:col-span-5">
                            <Label className="text-xs">Nome do Convênio</Label>
                            <Input {...register(`convenios.${index}.nome`)} className="mt-1" />
                          </div>
                          <div className="col-span-12 md:col-span-5">
                            <Label className="text-xs">Número da Carteirinha</Label>
                            <Input {...register(`convenios.${index}.numero`)} className="mt-1" />
                          </div>
                          <div className="col-span-12 md:col-span-1 flex items-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeConvenio(index)}
                              className="text-red-600 hover:text-red-700 w-full md:w-auto"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="col-span-12">
                            <Label className="text-xs">Upload do cartão</Label>
                            <Input
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  setValue(`convenios.${index}.arquivo`, file)
                                }
                              }}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendConvenio({ nome: '', numero: '' })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Convênio
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 8 - Pertences */}
            <TabsContent value="tab8">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <Textarea
                    {...register('pertencesLista')}
                    rows={6}
                    placeholder="Liste os pertences do residente, um por linha..."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 9 - Acomodação */}
            <TabsContent value="tab9">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Número do Quarto</Label>
                      <Input {...register('quartoNumero')} className="mt-2" />
                    </div>
                    <div>
                      <Label>Número do Leito</Label>
                      <Input {...register('leitoNumero')} className="mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
        </Tabs>

        {/* Indicador de progresso de upload */}
        {isUploading && (
          <div className="text-center mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-700 font-semibold">{uploadProgress}</p>
          </div>
        )}

        {/* Botões Finais */}
        <div className="text-center space-x-4">
          <Button
            type="submit"
            disabled={isUploading || isLoading}
            className="bg-gradient-to-r from-[#4361ee] to-[#3f37c9] hover:shadow-lg hover:-translate-y-0.5 transition-all px-8 py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading
              ? (isEditMode ? 'Atualizando...' : 'Salvando...')
              : (isEditMode ? 'Atualizar Residente' : 'Salvar Residente')
            }
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isUploading}
            className="px-8 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limpar
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ResidentForm
