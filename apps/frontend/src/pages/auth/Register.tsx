import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { api } from '../../services/api'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Eye, EyeOff, Loader2, Check, AlertCircle } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import { Checkbox } from '../../components/ui/checkbox'
import { Badge } from '../../components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { cn } from '../../lib/utils'
import { validarCPF } from '../../utils/validators'
import { getClientIP } from '../../utils/client-info'
import { featuresToArray } from '../../constants/features'
import ReactMarkdown from 'react-markdown'

interface Plan {
  id: string
  name: string
  displayName: string
  price: string | null  // Prisma retorna Decimal como string no JSON
  annualDiscountPercent?: string | null  // Prisma retorna Decimal como string
  maxUsers: number
  maxResidents: number
  features: Record<string, boolean>
  trialDays: number
  isPopular?: boolean
  isActive?: boolean
}

export default function Register() {
  const navigate = useNavigate()
  const { register, isLoading, error, clearError, isAuthenticated } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(1)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [loadingCNPJ, setLoadingCNPJ] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [currentContract, setCurrentContract] = useState<any>(null)
  const [loadingContract, setLoadingContract] = useState(false)
  const [privacyPolicy, setPrivacyPolicy] = useState<any>(null)
  const [loadingPrivacyPolicy, setLoadingPrivacyPolicy] = useState(false)

  // Timers de leitura
  const [privacyReadTime, setPrivacyReadTime] = useState(0)
  const [contractReadTime, setContractReadTime] = useState(0)
  const [readingStarted, setReadingStarted] = useState(false)

  const [formData, setFormData] = useState({
    // ILPI Data
    name: '',
    cnpj: '',
    email: '',
    phone: '',

    // Address
    addressZip: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressDistrict: '',
    addressCity: '',
    addressState: '',

    // Admin Data
    adminName: '',
    adminCpf: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',

    // Plan & Billing
    planId: '',
    billingCycle: 'MONTHLY' as 'MONTHLY' | 'ANNUAL',
    paymentMethod: '' as '' | 'PIX' | 'BOLETO' | 'CREDIT_CARD',

    // LGPD Declarations (Step 4)
    lgpdIsDataController: false,
    lgpdHasLegalBasis: false,
    lgpdAcknowledgesResponsibility: false,

    // Privacy Policy (Step 5)
    privacyPolicyAccepted: false,

    // Contract (Step 6)
    contractId: '',
    contractAccepted: false
  })

  const [showContractAlert, setShowContractAlert] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    clearError()
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const response = await api.get('/plans')
      setPlans(response.data)
      // Selecionar plano trial por padrão
      const trialPlan = response.data.find((p: Plan) => p.name === 'trial')
      if (trialPlan) {
        setFormData(prev => ({ ...prev, planId: trialPlan.id }))
      }
    } catch (err) {
      console.error('Erro ao carregar planos:', err)
    } finally {
      setLoadingPlans(false)
    }
  }

  // Carregar Política de Privacidade quando chegar no step 5
  useEffect(() => {
    if (currentStep === 5 && !privacyPolicy) {
      loadPrivacyPolicy()
    }
  }, [currentStep])

  // Carregar contrato quando chegar no step 6 (antes era step 4)
  useEffect(() => {
    if (currentStep === 6 && formData.planId && !currentContract) {
      loadActiveContract()
    }
  }, [currentStep, formData.planId])

  // Timer de leitura da Política de Privacidade (step 5)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (currentStep === 5 && readingStarted) {
      interval = setInterval(() => {
        setPrivacyReadTime(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentStep, readingStarted])

  // Timer de leitura do Contrato (step 6)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (currentStep === 6 && readingStarted) {
      interval = setInterval(() => {
        setContractReadTime(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentStep, readingStarted])

  // Iniciar timer ao entrar nos steps 5 ou 6
  useEffect(() => {
    if (currentStep === 5 || currentStep === 6) {
      setReadingStarted(true)
    } else {
      setReadingStarted(false)
    }
  }, [currentStep])

  // Resetar PIX se mudar de ANNUAL para MONTHLY
  useEffect(() => {
    if (formData.billingCycle === 'MONTHLY' && formData.paymentMethod === 'PIX') {
      setFormData(prev => ({ ...prev, paymentMethod: '' }))
    }
  }, [formData.billingCycle])

  const loadActiveContract = async () => {
    setLoadingContract(true)
    try {
      // 1. Buscar contrato ativo
      const contractResponse = await api.get(`/contracts/active?planId=${formData.planId}`)
      const contract = contractResponse.data

      // 2. Buscar dados do plano para renderizar
      const plan = plans.find(p => p.id === formData.planId)

      // 3. Renderizar contrato com variáveis
      const variables = {
        tenant: {
          name: formData.name,
          cnpj: formData.cnpj,
          email: formData.email
        },
        user: {
          name: formData.adminName,
          cpf: formData.adminCpf,
          email: formData.adminEmail
        },
        plan: {
          name: plan?.name || '',
          displayName: plan?.displayName || '',
          price: plan?.price || null,
          maxUsers: plan?.maxUsers || 0,
          maxResidents: plan?.maxResidents || 0
        },
        trial: {
          days: plan?.trialDays || 0
        }
      }

      const renderResponse = await api.post('/contracts/render', {
        contractId: contract.id,
        variables
      })

      setCurrentContract({
        ...contract,
        content: renderResponse.data.content
      })
      setFormData(prev => ({ ...prev, contractId: contract.id }))
    } catch (err) {
      // Sem contrato disponível - bloquear cadastro
      setErrors({ contract: 'Nenhum contrato disponível no momento. Entre em contato com o suporte.' })
    } finally {
      setLoadingContract(false)
    }
  }

  const loadPrivacyPolicy = async () => {
    setLoadingPrivacyPolicy(true)
    try {
      const response = await api.get('/privacy-policy')
      setPrivacyPolicy(response.data)
    } catch (err) {
      console.error('Erro ao carregar política de privacidade:', err)
      setErrors({ privacyPolicy: 'Não foi possível carregar a Política de Privacidade. Entre em contato com o suporte.' })
    } finally {
      setLoadingPrivacyPolicy(false)
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1: // ILPI Data
        if (!formData.name) newErrors.name = 'Nome da ILPI é obrigatório'
        if (!formData.email) newErrors.email = 'Email é obrigatório'
        if (!formData.phone) newErrors.phone = 'Telefone é obrigatório'

        // Validação de CEP
        if (!formData.addressZip) {
          newErrors.addressZip = 'CEP é obrigatório'
        } else if (!/^\d{5}-\d{3}$/.test(formData.addressZip)) {
          newErrors.addressZip = 'CEP deve estar no formato XXXXX-XXX'
        }

        // Validação de CNPJ (obrigatório)
        if (!formData.cnpj) {
          newErrors.cnpj = 'CNPJ é obrigatório'
        } else if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(formData.cnpj)) {
          newErrors.cnpj = 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX'
        }

        if (!formData.addressStreet) newErrors.addressStreet = 'Rua é obrigatória'
        if (!formData.addressNumber) newErrors.addressNumber = 'Número é obrigatório'
        if (!formData.addressDistrict) newErrors.addressDistrict = 'Bairro é obrigatório'
        if (!formData.addressCity) newErrors.addressCity = 'Cidade é obrigatória'
        if (!formData.addressState) newErrors.addressState = 'Estado é obrigatório'
        break

      case 2: // Admin Data
        if (!formData.adminName) newErrors.adminName = 'Nome do administrador é obrigatório'

        // Validação de CPF
        if (!formData.adminCpf) {
          newErrors.adminCpf = 'CPF é obrigatório'
        } else if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(formData.adminCpf)) {
          newErrors.adminCpf = 'CPF deve estar no formato XXX.XXX.XXX-XX'
        } else if (!validarCPF(formData.adminCpf)) {
          newErrors.adminCpf = 'CPF inválido'
        }

        if (!formData.adminEmail) newErrors.adminEmail = 'Email do administrador é obrigatório'

        // Validação de senha complexa
        if (!formData.adminPassword) {
          newErrors.adminPassword = 'Senha é obrigatória'
        } else if (formData.adminPassword.length < 8) {
          newErrors.adminPassword = 'Senha deve ter no mínimo 8 caracteres'
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.adminPassword)) {
          newErrors.adminPassword = 'Senha deve conter: maiúscula, minúscula, número e caractere especial (@$!%*?&)'
        }

        if (formData.adminPassword !== formData.adminPasswordConfirm) {
          newErrors.adminPasswordConfirm = 'As senhas não coincidem'
        }
        break

      case 3: // Plan
        if (!formData.planId) newErrors.planId = 'Selecione um plano'
        break

      case 4: // LGPD Declarations
        if (!formData.lgpdIsDataController) {
          newErrors.lgpdIsDataController = 'Você deve confirmar que a ILPI é controladora dos dados'
        }
        if (!formData.lgpdHasLegalBasis) {
          newErrors.lgpdHasLegalBasis = 'Você deve confirmar que possui base legal para tratamento de dados'
        }
        if (!formData.lgpdAcknowledgesResponsibility) {
          newErrors.lgpdAcknowledgesResponsibility = 'Você deve reconhecer as responsabilidades LGPD'
        }
        break

      case 5: // Privacy Policy
        if (privacyReadTime < 30) {
          newErrors.privacyPolicy = 'Você deve ler a Política de Privacidade por pelo menos 30 segundos antes de aceitar'
        }
        if (!formData.privacyPolicyAccepted) {
          newErrors.privacyPolicyAccepted = 'Você deve aceitar a Política de Privacidade para continuar'
        }
        break

      case 6: // Contract
        if (contractReadTime < 60) {
          newErrors.contract = 'Você deve ler o Contrato por pelo menos 60 segundos antes de aceitar'
        }
        if (!formData.contractAccepted) {
          newErrors.contractAccepted = 'Você deve aceitar o contrato para continuar'
        }
        break

      case 7: // Payment Method
        if (!formData.paymentMethod) {
          newErrors.paymentMethod = 'Selecione um método de pagamento'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1)
    clearError()
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    // Verificar aceite do contrato ANTES da validação completa
    if (!formData.contractAccepted) {
      setShowContractAlert(true)
      return
    }

    if (!validateStep(currentStep)) return

    clearError()

    try {
      // Capturar informações do cliente
      const ipAddress = await getClientIP()
      const userAgent = navigator.userAgent

      // Buscar dados do plano selecionado para substituição de variáveis
      const selectedPlan = plans.find(p => p.id === formData.planId)
      if (!selectedPlan) {
        throw new Error('Plano não encontrado')
      }

      // Preparar variáveis para substituição no template do contrato
      const variables = {
        tenant: {
          name: formData.name,
          cnpj: formData.cnpj,
          email: formData.email,
        },
        user: {
          name: formData.adminName,
          cpf: formData.adminCpf,
          email: formData.adminEmail,
        },
        plan: {
          name: selectedPlan.name,
          displayName: selectedPlan.displayName,
          price: selectedPlan.price ? parseFloat(selectedPlan.price) : 0,
          maxUsers: selectedPlan.maxUsers,
          maxResidents: selectedPlan.maxResidents,
        },
        trial: {
          days: selectedPlan.trialDays || 0,
        },
        today: new Date().toLocaleDateString('pt-BR'),
      }

      // Preparar aceite do contrato com variáveis
      const acceptanceResponse = await api.post('/contracts/accept/prepare', {
        contractId: formData.contractId,
        ipAddress,
        userAgent,
        variables,
      })

      const acceptanceToken = acceptanceResponse.data.acceptanceToken

      // Enviar dados de registro com token
      const { adminPasswordConfirm, addressZip, contractId, contractAccepted, ...rest } = formData
      const dataToSubmit = {
        ...rest,
        addressZipCode: addressZip,
        acceptanceToken
      }

      // Salvar dados necessários antes de fazer logout
      const adminEmail = formData.adminEmail
      const tenantName = formData.name

      await register(dataToSubmit)

      // Limpar dados sensíveis e redirecionar para página de boas-vindas
      localStorage.removeItem('registration-data')
      sessionStorage.clear()

      // Fazer logout para garantir sessão limpa
      useAuthStore.getState().logout()

      navigate('/welcome', {
        replace: true,
        state: {
          adminEmail,
          tenantName
        }
      })
    } catch (err) {
      // Erro já tratado no store
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let formattedValue = value

    // Aplicar máscaras
    if (name === 'cnpj') {
      // Máscara CNPJ: XX.XXX.XXX/XXXX-XX
      formattedValue = value
        .replace(/\D/g, '') // Remove tudo que não é dígito
        .replace(/^(\d{2})(\d)/, '$1.$2') // Coloca ponto após os 2 primeiros dígitos
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3') // Coloca ponto após o 5º dígito
        .replace(/\.(\d{3})(\d)/, '.$1/$2') // Coloca barra após o 8º dígito
        .replace(/(\d{4})(\d)/, '$1-$2') // Coloca hífen após o 12º dígito
        .substring(0, 18) // Limita ao tamanho máximo
    } else if (name === 'addressZip') {
      // Máscara CEP: XXXXX-XXX
      formattedValue = value
        .replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .substring(0, 9)
    } else if (name === 'phone') {
      // Máscara Telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
      const numbers = value.replace(/\D/g, '')

      if (numbers.length <= 10) {
        // Telefone fixo: (XX) XXXX-XXXX
        formattedValue = numbers
          .replace(/^(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d)/, '$1-$2')
      } else {
        // Celular: (XX) XXXXX-XXXX
        formattedValue = numbers
          .replace(/^(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{5})(\d)/, '$1-$2')
          .substring(0, 15)
      }
    } else if (name === 'adminCpf') {
      // Máscara CPF: XXX.XXX.XXX-XX
      formattedValue = value
        .replace(/\D/g, '') // Remove tudo que não é dígito
        .replace(/^(\d{3})(\d)/, '$1.$2') // Coloca ponto após os 3 primeiros dígitos
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3') // Coloca ponto após o 6º dígito
        .replace(/\.(\d{3})(\d)/, '.$1-$2') // Coloca hífen após o 9º dígito
        .substring(0, 14) // Limita ao tamanho máximo
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }))
    // Limpar erro do campo ao digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const fetchCompanyData = async () => {
    if (formData.cnpj.length !== 18) return // Formato: XX.XXX.XXX/XXXX-XX

    setLoadingCNPJ(true)
    try {
      const cnpjNumbers = formData.cnpj.replace(/\D/g, '')
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjNumbers}`)

      if (!response.ok) {
        setErrors(prev => ({
          ...prev,
          cnpj: 'CNPJ não encontrado ou inválido'
        }))
        return
      }

      const data = await response.json()

      // Preencher APENAS o nome da ILPI
      setFormData(prev => ({
        ...prev,
        name: data.razao_social || data.nome_fantasia || ''
      }))

      // Limpar erro de CNPJ se houver
      if (errors.cnpj) {
        setErrors(prev => ({
          ...prev,
          cnpj: ''
        }))
      }
    } catch (err) {
      console.error('Erro ao buscar CNPJ:', err)
      setErrors(prev => ({
        ...prev,
        cnpj: 'Erro ao consultar CNPJ. Tente novamente.'
      }))
    } finally {
      setLoadingCNPJ(false)
    }
  }

  const fetchAddress = async () => {
    if (formData.addressZip.length !== 9) return // Formato: 00000-000

    try {
      const cep = formData.addressZip.replace('-', '')
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await response.json()

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          addressStreet: data.logradouro || '',
          addressDistrict: data.bairro || '',
          addressCity: data.localidade || '',
          addressState: data.uf || ''
        }))
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err)
    }
  }

  // Step 1: Dados da ILPI
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cnpj">CNPJ *</Label>
        <div className="relative">
          <Input
            id="cnpj"
            name="cnpj"
            value={formData.cnpj}
            onChange={handleChange}
            onBlur={fetchCompanyData}
            placeholder="00.000.000/0000-00"
            maxLength={18}
            className={errors.cnpj ? 'border-red-500' : ''}
            disabled={loadingCNPJ}
          />
          {loadingCNPJ && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>
        {errors.cnpj && <p className="text-sm text-red-500">{errors.cnpj}</p>}
        {!errors.cnpj && !loadingCNPJ && (
          <p className="text-xs text-gray-500">
            Digite o CNPJ para buscar automaticamente os dados da empresa
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome da ILPI *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Será preenchido automaticamente pelo CNPJ"
          className={errors.name ? 'border-red-500' : ''}
          readOnly={!!formData.name && formData.cnpj.length === 18}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        {formData.name && formData.cnpj.length === 18 && (
          <p className="text-xs text-green-600">
            ✓ Preenchido automaticamente via CNPJ
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone *</Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="(00) 00000-0000"
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email da ILPI *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="contato@ilpi.com.br"
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-medium mb-3">Endereço</h3>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="addressZip">CEP *</Label>
              <Input
                id="addressZip"
                name="addressZip"
                value={formData.addressZip}
                onChange={handleChange}
                onBlur={fetchAddress}
                placeholder="00000-000"
                maxLength={9}
                className={errors.addressZip ? 'border-red-500' : ''}
              />
              {errors.addressZip && <p className="text-sm text-red-500">{errors.addressZip}</p>}
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="addressStreet">Rua *</Label>
              <Input
                id="addressStreet"
                name="addressStreet"
                value={formData.addressStreet}
                onChange={handleChange}
                placeholder="Rua Exemplo"
                className={errors.addressStreet ? 'border-red-500' : ''}
              />
              {errors.addressStreet && <p className="text-sm text-red-500">{errors.addressStreet}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="addressNumber">Número *</Label>
              <Input
                id="addressNumber"
                name="addressNumber"
                value={formData.addressNumber}
                onChange={handleChange}
                placeholder="123"
                className={errors.addressNumber ? 'border-red-500' : ''}
              />
              {errors.addressNumber && <p className="text-sm text-red-500">{errors.addressNumber}</p>}
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="addressComplement">Complemento</Label>
              <Input
                id="addressComplement"
                name="addressComplement"
                value={formData.addressComplement}
                onChange={handleChange}
                placeholder="Apto, Sala, etc"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="addressDistrict">Bairro *</Label>
              <Input
                id="addressDistrict"
                name="addressDistrict"
                value={formData.addressDistrict}
                onChange={handleChange}
                placeholder="Centro"
                className={errors.addressDistrict ? 'border-red-500' : ''}
              />
              {errors.addressDistrict && <p className="text-sm text-red-500">{errors.addressDistrict}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressCity">Cidade *</Label>
              <Input
                id="addressCity"
                name="addressCity"
                value={formData.addressCity}
                onChange={handleChange}
                placeholder="São Paulo"
                className={errors.addressCity ? 'border-red-500' : ''}
              />
              {errors.addressCity && <p className="text-sm text-red-500">{errors.addressCity}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressState">Estado *</Label>
            <Input
              id="addressState"
              name="addressState"
              value={formData.addressState}
              onChange={handleChange}
              placeholder="SP"
              maxLength={2}
              className={errors.addressState ? 'border-red-500' : ''}
            />
            {errors.addressState && <p className="text-sm text-red-500">{errors.addressState}</p>}
          </div>
        </div>
      </div>
    </div>
  )

  // Step 2: Dados do Administrador
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="adminName">Nome completo *</Label>
        <Input
          id="adminName"
          name="adminName"
          value={formData.adminName}
          onChange={handleChange}
          placeholder="João Silva"
          className={errors.adminName ? 'border-red-500' : ''}
        />
        {errors.adminName && <p className="text-sm text-red-500">{errors.adminName}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminCpf">CPF *</Label>
        <Input
          id="adminCpf"
          name="adminCpf"
          value={formData.adminCpf}
          onChange={handleChange}
          placeholder="000.000.000-00"
          maxLength={14}
          className={errors.adminCpf ? 'border-red-500' : ''}
        />
        {errors.adminCpf && <p className="text-sm text-red-500">{errors.adminCpf}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminEmail">Email do administrador *</Label>
        <Input
          id="adminEmail"
          name="adminEmail"
          type="email"
          value={formData.adminEmail}
          onChange={handleChange}
          placeholder="admin@ilpi.com.br"
          className={errors.adminEmail ? 'border-red-500' : ''}
        />
        {errors.adminEmail && <p className="text-sm text-red-500">{errors.adminEmail}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminPassword">Senha *</Label>
        <div className="relative">
          <Input
            id="adminPassword"
            name="adminPassword"
            type={showPassword ? 'text' : 'password'}
            value={formData.adminPassword}
            onChange={handleChange}
            placeholder="Mínimo 8 caracteres"
            className={errors.adminPassword ? 'border-red-500' : ''}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.adminPassword && <p className="text-sm text-red-500">{errors.adminPassword}</p>}
        {!errors.adminPassword && (
          <p className="text-xs text-gray-500">
            Mínimo 8 caracteres com: maiúscula, minúscula, número e caractere especial (@$!%*?&)
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminPasswordConfirm">Confirmar senha *</Label>
        <div className="relative">
          <Input
            id="adminPasswordConfirm"
            name="adminPasswordConfirm"
            type={showPasswordConfirm ? 'text' : 'password'}
            value={formData.adminPasswordConfirm}
            onChange={handleChange}
            placeholder="Digite a senha novamente"
            className={errors.adminPasswordConfirm ? 'border-red-500' : ''}
          />
          <button
            type="button"
            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            tabIndex={-1}
          >
            {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.adminPasswordConfirm && <p className="text-sm text-red-500">{errors.adminPasswordConfirm}</p>}
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription>
          Este será o primeiro usuário administrador da ILPI. Você poderá adicionar outros usuários após o cadastro.
        </AlertDescription>
      </Alert>
    </div>
  )

  // Step 3: Seleção de Plano
  const renderStep3 = () => (
    <div className="space-y-4">
      {loadingPlans ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <RadioGroup value={formData.planId} onValueChange={(value) => setFormData(prev => ({ ...prev, planId: value }))}>
          <div className="grid gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-lg border p-4 transition-shadow",
                  plan.isActive ? "cursor-pointer hover:shadow-md" : "cursor-not-allowed",
                  formData.planId === plan.id ? "border-blue-500 bg-blue-50" : "border-gray-200",
                  plan.isPopular && plan.isActive && "ring-2 ring-blue-500"
                )}
              >
                {/* Overlay para planos inativos */}
                {!plan.isActive && (
                  <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center z-10 backdrop-blur-[1px]">
                    <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg font-semibold">
                      Temporariamente Indisponível
                    </div>
                  </div>
                )}

                <RadioGroupItem
                  value={plan.id}
                  id={plan.id}
                  className="sr-only"
                  disabled={!plan.isActive}
                />
                <Label
                  htmlFor={plan.id}
                  className={cn(
                    "cursor-pointer",
                    !plan.isActive && "cursor-not-allowed"
                  )}
                >
                  {plan.isPopular && (
                    <span className="absolute -top-3 left-4 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Mais Popular
                    </span>
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{plan.displayName}</h3>
                      <p className="text-gray-600 text-sm">
                        {plan.maxUsers === -1 ? 'Usuários ilimitados' : `Até ${plan.maxUsers} usuários`} •
                        {plan.maxResidents === -1 ? ' Residentes ilimitados' : ` Até ${plan.maxResidents} residentes`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {plan.price === null
                          ? 'Sob consulta'
                          : Number(plan.price) === 0
                            ? 'Grátis'
                            : `R$ ${Number(plan.price).toFixed(2)}`
                        }
                      </p>
                      {plan.price !== null && Number(plan.price) > 0 && <p className="text-sm text-gray-500">/mês</p>}
                      {plan.trialDays > 0 && (
                        <p className="text-sm text-green-600 font-medium mt-1">
                          {plan.trialDays} dias grátis
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mt-3">
                    {featuresToArray(plan.features).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      )}

      {errors.planId && <p className="text-sm text-red-500">{errors.planId}</p>}

      {/* Seção: Ciclo de Cobrança (aparece após selecionar plano) */}
      {formData.planId && (() => {
        const selectedPlan = plans.find(p => p.id === formData.planId)
        if (!selectedPlan || !selectedPlan.price || Number(selectedPlan.price) === 0) return null

        const monthlyPrice = Number(selectedPlan.price)
        const annualDiscount = selectedPlan.annualDiscountPercent ? Number(selectedPlan.annualDiscountPercent) : 0
        const annualPriceMonthly = monthlyPrice * 12
        const annualPriceWithDiscount = annualPriceMonthly * (1 - annualDiscount / 100)
        const savings = annualPriceMonthly - annualPriceWithDiscount

        return (
          <div className="mt-6 space-y-3 pt-6 border-t border-gray-200">
            <Label className="text-base font-semibold">Ciclo de Cobrança</Label>
            <RadioGroup
              value={formData.billingCycle}
              onValueChange={(value) => setFormData(prev => ({ ...prev, billingCycle: value as 'MONTHLY' | 'ANNUAL' }))}
            >
              {/* Opção Mensal */}
              <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                <RadioGroupItem value="MONTHLY" id="monthly" />
                <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">💳 Mensal</p>
                    <p className="text-sm text-gray-600">
                      R$ {monthlyPrice.toFixed(2)}/mês
                    </p>
                  </div>
                </Label>
              </div>

              {/* Opção Anual (se houver desconto configurado) */}
              {annualDiscount > 0 ? (
                <div className="flex items-center space-x-2 border-2 border-green-500 rounded-lg p-4 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer">
                  <RadioGroupItem value="ANNUAL" id="annual" />
                  <Label htmlFor="annual" className="flex-1 cursor-pointer">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">🎉 Anual</p>
                        <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                          Economize {annualDiscount}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        R$ {annualPriceWithDiscount.toFixed(2)}/ano
                        <span className="ml-2 line-through text-gray-400">
                          R$ {annualPriceMonthly.toFixed(2)}
                        </span>
                      </p>
                      <p className="text-xs text-green-700 font-medium mt-1">
                        💰 Você economiza R$ {savings.toFixed(2)} por ano
                      </p>
                    </div>
                  </Label>
                </div>
              ) : (
                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <RadioGroupItem value="ANNUAL" id="annual" />
                  <Label htmlFor="annual" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">📅 Anual</p>
                      <p className="text-sm text-gray-600">
                        R$ {annualPriceMonthly.toFixed(2)}/ano
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Pagamento único anual
                      </p>
                    </div>
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>
        )
      })()}
    </div>
  )

  // Step 4: Declarações LGPD
  const renderStep4 = () => (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription>
          <strong>Contexto Legal LGPD:</strong> Antes de prosseguir, é importante esclarecer os papéis e responsabilidades conforme a Lei Geral de Proteção de Dados (LGPD).
        </AlertDescription>
      </Alert>

      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="space-y-4 text-sm">
          <p className="font-medium text-blue-900">
            <strong>Entenda os papéis LGPD:</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 text-blue-800">
            <li><strong>ILPI (você)</strong> = <strong>Controladora de Dados:</strong> Define finalidades e toma decisões sobre tratamento de dados dos residentes</li>
            <li><strong>Rafa Labs</strong> = <strong>Operadora de Dados:</strong> Apenas processa dados conforme suas instruções, fornecendo infraestrutura tecnológica</li>
          </ul>
        </div>
      </Card>

      <div className="space-y-4">
        {/* Declaração 1 */}
        <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border-2">
          <Checkbox
            id="lgpdIsDataController"
            checked={formData.lgpdIsDataController}
            onCheckedChange={(checked) =>
              setFormData(prev => ({ ...prev, lgpdIsDataController: !!checked }))
            }
          />
          <div className="flex-1">
            <label htmlFor="lgpdIsDataController" className="text-sm font-medium cursor-pointer block">
              Declaro que a ILPI é <strong>Controladora dos Dados Pessoais</strong> dos residentes
            </label>
            <p className="text-xs text-gray-600 mt-1">
              A ILPI define as finalidades e é responsável pela coleta, uso e armazenamento dos dados de saúde e pessoais dos residentes.
            </p>
          </div>
        </div>
        {errors.lgpdIsDataController && (
          <p className="text-sm text-red-500">{errors.lgpdIsDataController}</p>
        )}

        {/* Declaração 2 */}
        <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border-2">
          <Checkbox
            id="lgpdHasLegalBasis"
            checked={formData.lgpdHasLegalBasis}
            onCheckedChange={(checked) =>
              setFormData(prev => ({ ...prev, lgpdHasLegalBasis: !!checked }))
            }
          />
          <div className="flex-1">
            <label htmlFor="lgpdHasLegalBasis" className="text-sm font-medium cursor-pointer block">
              Declaro que possuo <strong>base legal</strong> para tratamento de dados dos residentes
            </label>
            <p className="text-xs text-gray-600 mt-1">
              A ILPI possui autorização legal (contrato de prestação de serviços com responsáveis legais, tutela, curatela ou consentimento) para coletar e tratar dados pessoais sensíveis de saúde.
            </p>
          </div>
        </div>
        {errors.lgpdHasLegalBasis && (
          <p className="text-sm text-red-500">{errors.lgpdHasLegalBasis}</p>
        )}

        {/* Declaração 3 */}
        <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border-2">
          <Checkbox
            id="lgpdAcknowledgesResponsibility"
            checked={formData.lgpdAcknowledgesResponsibility}
            onCheckedChange={(checked) =>
              setFormData(prev => ({ ...prev, lgpdAcknowledgesResponsibility: !!checked }))
            }
          />
          <div className="flex-1">
            <label htmlFor="lgpdAcknowledgesResponsibility" className="text-sm font-medium cursor-pointer block">
              Reconheço as <strong>responsabilidades da ILPI</strong> como Controladora de Dados
            </label>
            <p className="text-xs text-gray-600 mt-1">
              A ILPI é responsável por: obter consentimento dos titulares/responsáveis legais, garantir exatidão dos dados, comunicar incidentes à ANPD, atender solicitações de titulares (acesso, retificação, exclusão), e manter conformidade com LGPD, RDC 502/2021 ANVISA e CFM 1.821/2007.
            </p>
          </div>
        </div>
        {errors.lgpdAcknowledgesResponsibility && (
          <p className="text-sm text-red-500">{errors.lgpdAcknowledgesResponsibility}</p>
        )}
      </div>
    </div>
  )

  // Step 5: Política de Privacidade
  const renderStep5 = () => (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription>
          Leia atentamente a Política de Privacidade antes de continuar. <strong>Tempo mínimo de leitura: 30 segundos.</strong>
        </AlertDescription>
      </Alert>

      {/* Timer de leitura */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-blue-300">
        <span className="text-sm font-medium text-blue-900">
          {privacyReadTime >= 30 ? '✅ Tempo mínimo de leitura atingido' : '⏱️ Lendo Política de Privacidade...'}
        </span>
        <span className={cn(
          "text-lg font-bold",
          privacyReadTime >= 30 ? "text-green-600" : "text-blue-600"
        )}>
          {privacyReadTime}s / 30s
        </span>
      </div>

      {loadingPrivacyPolicy ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : privacyPolicy ? (
        <Card className="p-6 max-h-96 overflow-y-auto border-2">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{privacyPolicy.content}</ReactMarkdown>
          </div>
        </Card>
      ) : null}

      {errors.privacyPolicy && (
        <Alert variant="destructive">
          <AlertDescription>{errors.privacyPolicy}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-start space-x-2 p-4 bg-gray-50 rounded-lg">
        <Checkbox
          id="privacyPolicyAccepted"
          checked={formData.privacyPolicyAccepted}
          disabled={privacyReadTime < 30}
          onCheckedChange={(checked) =>
            setFormData(prev => ({ ...prev, privacyPolicyAccepted: !!checked }))
          }
        />
        <label
          htmlFor="privacyPolicyAccepted"
          className={cn(
            "text-sm leading-relaxed cursor-pointer",
            privacyReadTime < 30 && "text-gray-400 cursor-not-allowed"
          )}
        >
          Li e aceito a Política de Privacidade da plataforma RAFA ILPI
        </label>
      </div>
      {errors.privacyPolicyAccepted && (
        <p className="text-sm text-red-500">{errors.privacyPolicyAccepted}</p>
      )}

      <div className="text-center">
        <a
          href="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Abrir Política de Privacidade em nova aba
        </a>
      </div>
    </div>
  )

  // Step 6: Aceite do Contrato (antes era Step 4)
  const renderStep6 = () => (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription>
          Leia atentamente o contrato de prestação de serviços antes de continuar. <strong>Tempo mínimo de leitura: 60 segundos.</strong>
        </AlertDescription>
      </Alert>

      {/* Timer de leitura */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-blue-300">
        <span className="text-sm font-medium text-blue-900">
          {contractReadTime >= 60 ? '✅ Tempo mínimo de leitura atingido' : '⏱️ Lendo Contrato de Serviço...'}
        </span>
        <span className={cn(
          "text-lg font-bold",
          contractReadTime >= 60 ? "text-green-600" : "text-blue-600"
        )}>
          {contractReadTime}s / 60s
        </span>
      </div>

      {loadingContract ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : currentContract ? (
        <Card className="p-6 max-h-96 overflow-y-auto border-2">
          <div dangerouslySetInnerHTML={{ __html: currentContract.content }} />
        </Card>
      ) : null}

      {errors.contract && (
        <Alert variant="destructive">
          <AlertDescription>{errors.contract}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-start space-x-2 p-4 bg-gray-50 rounded-lg">
        <Checkbox
          id="contractAccepted"
          checked={formData.contractAccepted}
          disabled={contractReadTime < 60}
          onCheckedChange={(checked) =>
            setFormData(prev => ({ ...prev, contractAccepted: !!checked }))
          }
        />
        <label
          htmlFor="contractAccepted"
          className={cn(
            "text-sm leading-relaxed cursor-pointer",
            contractReadTime < 60 && "text-gray-400 cursor-not-allowed"
          )}
        >
          Li e aceito os termos do contrato de prestação de serviços da plataforma RAFA ILPI
        </label>
      </div>
      {errors.contractAccepted && (
        <p className="text-sm text-red-500">{errors.contractAccepted}</p>
      )}
    </div>
  )

  // Step 7: Seleção de Método de Pagamento
  const renderStep7 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">💳 Dados de Cobrança</h2>
        <p className="text-slate-600 mt-2">
          Complete as informações para finalizar seu cadastro
        </p>
      </div>

      {/* Seção 1: Dados da ILPI (resumo readonly) */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900 mb-2">
              📋 Dados de Cobrança (ILPI)
            </p>
            <div className="space-y-1 text-sm text-blue-800">
              <p><strong>Nome:</strong> {formData.name}</p>
              <p><strong>CNPJ:</strong> {formData.cnpj}</p>
              <p><strong>Email:</strong> {formData.email}</p>
              <p><strong>Telefone:</strong> {formData.phone}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(1)}
            className="text-blue-600 hover:text-blue-700"
          >
            ✏️ Editar
          </Button>
        </div>
      </Card>

      {/* Seção 2: Método de Pagamento */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Escolha o Método de Pagamento Preferido</Label>
        <p className="text-xs text-gray-600">
          Você poderá alterar esta preferência posteriormente no painel de configurações.
        </p>

        <RadioGroup
          value={formData.paymentMethod}
          onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value as 'PIX' | 'BOLETO' | 'CREDIT_CARD' }))}
        >
          {/* PIX - Apenas para Plano Anual */}
          {formData.billingCycle === 'ANNUAL' ? (
            <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 cursor-pointer relative">
              <RadioGroupItem value="PIX" id="pix" />
              <Label htmlFor="pix" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">PIX</p>
                      <Badge variant="default" className="bg-green-600 text-xs">
                        Apenas Anual
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Confirmação instantânea
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          ) : (
            <div className="flex items-center space-x-2 border border-gray-200 rounded-lg p-4 bg-gray-100 opacity-60 cursor-not-allowed relative">
              <RadioGroupItem value="PIX" id="pix" disabled />
              <Label htmlFor="pix" className="flex-1 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-2xl grayscale opacity-50">💰</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-500">PIX</p>
                      <Badge variant="outline" className="text-xs text-gray-500 border-gray-400">
                        Disponível apenas no plano anual
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      Selecione o ciclo anual no Step 3 para habilitar
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          )}

          {/* Boleto */}
          <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <RadioGroupItem value="BOLETO" id="boleto" />
            <Label htmlFor="boleto" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🧾</span>
                </div>
                <div>
                  <p className="font-medium">Boleto Bancário</p>
                  <p className="text-sm text-gray-600">
                    Confirmação em até 3 dias úteis
                  </p>
                </div>
              </div>
            </Label>
          </div>

          {/* Cartão de Crédito */}
          <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <RadioGroupItem value="CREDIT_CARD" id="credit-card" />
            <Label htmlFor="credit-card" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💳</span>
                </div>
                <div>
                  <p className="font-medium">Cartão de Crédito</p>
                  <p className="text-sm text-gray-600">
                    Renovação automática mensal
                  </p>
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Disclaimer LGPD sobre Asaas */}
      <Card className="p-4 bg-gray-50 border-gray-200">
        <p className="text-xs text-gray-600">
          🔒 <strong>Segurança e Privacidade:</strong> Os dados de pagamento são processados
          exclusivamente pela <strong>Asaas Gestão Financeira</strong>, operadora de pagamentos
          certificada PCI-DSS nível 1. A Rafa Labs não armazena dados de cartão de crédito.
        </p>
      </Card>

      {/* Validação */}
      {errors.paymentMethod && (
        <p className="text-sm text-red-500">{errors.paymentMethod}</p>
      )}
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Cadastro de ILPI
          </CardTitle>
          <CardDescription className="text-center">
            Configure sua ILPI no sistema Rafa
          </CardDescription>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mt-6">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                      currentStep >= step
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    )}
                  >
                    {step}
                  </div>
                  {step < 7 && (
                    <div
                      className={cn(
                        "w-8 h-1",
                        currentStep > step ? "bg-blue-600" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center mt-2 text-sm text-gray-600">
            {currentStep === 1 && "Dados da ILPI"}
            {currentStep === 2 && "Administrador"}
            {currentStep === 3 && "Escolha o Plano"}
            {currentStep === 4 && "Declarações LGPD"}
            {currentStep === 5 && "Política de Privacidade"}
            {currentStep === 6 && "Contrato de Serviço"}
            {currentStep === 7 && "Dados de Cobrança"}
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
            {currentStep === 6 && renderStep6()}
            {currentStep === 7 && renderStep7()}

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isLoading}
              >
                Voltar
              </Button>
            ) : (
              <Link to="/login">
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </Link>
            )}

            {currentStep < 7 ? (
              <Button type="button" onClick={handleNext}>
                Próximo
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  'Criar conta'
                )}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>

      {/* Alert Dialog: Aceite Obrigatório */}
      <AlertDialog open={showContractAlert} onOpenChange={setShowContractAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Aceite do Contrato Necessário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Para prosseguir com a criação da conta, você precisa ler e aceitar o Contrato de Prestação de Serviços.
              <br /><br />
              Por favor, marque a caixa de seleção <strong>"Li e aceito os termos do contrato"</strong> antes de clicar em "Criar conta".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowContractAlert(false)}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}