import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
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

interface TermsOfServiceWithContent {
  id: string
  version: string
  planId: string | null
  status: 'DRAFT' | 'ACTIVE' | 'REVOKED'
  effectiveFrom: string | null
  title: string
  content: string
  contentHash: string
  createdBy: string
  createdAt: string
}

interface PrivacyPolicyResponse {
  version: string
  effectiveDate: string
  content: string
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
  const [currentTerms, setCurrentTerms] = useState<TermsOfServiceWithContent | null>(null)
  const [loadingTerms, setLoadingTerms] = useState(false)
  const [privacyPolicy, setPrivacyPolicy] = useState<PrivacyPolicyResponse | null>(null)
  const [loadingPrivacyPolicy, setLoadingPrivacyPolicy] = useState(false)

  // Controle de leitura por rolagem (>= 98%)
  const [privacyScrolledToEnd, setPrivacyScrolledToEnd] = useState(false)
  const [termsScrolledToEnd, setTermsScrolledToEnd] = useState(false)
  const privacyContentRef = useRef<HTMLDivElement | null>(null)
  const termsContentRef = useRef<HTMLDivElement | null>(null)

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

    // Terms of Service (Step 6)
    termsId: '',
    termsAccepted: false
  })

  const [showTermsAlert, setShowTermsAlert] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    clearError()
    loadPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  // Carregar termo de uso quando chegar no step 6 (antes era step 4)
  useEffect(() => {
    if (currentStep === 6 && formData.planId && !currentTerms) {
      loadActiveTerms()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, formData.planId])

  const hasScrolledToEnd = (element: HTMLDivElement): boolean => {
    const { scrollTop, clientHeight, scrollHeight } = element
    if (scrollHeight <= clientHeight) return true
    return (scrollTop + clientHeight) / scrollHeight >= 0.98
  }

  const handlePrivacyScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (hasScrolledToEnd(event.currentTarget)) {
      setPrivacyScrolledToEnd(true)
    }
  }

  const handleTermsScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (hasScrolledToEnd(event.currentTarget)) {
      setTermsScrolledToEnd(true)
    }
  }

  useEffect(() => {
    if (currentStep === 5 && privacyContentRef.current) {
      setPrivacyScrolledToEnd(hasScrolledToEnd(privacyContentRef.current))
    }
  }, [currentStep, privacyPolicy])

  useEffect(() => {
    if (currentStep === 6 && termsContentRef.current) {
      setTermsScrolledToEnd(hasScrolledToEnd(termsContentRef.current))
    }
  }, [currentStep, currentTerms])


  const loadActiveTerms = async () => {
    setLoadingTerms(true)
    try {
      // 1. Buscar termo de uso ativo
      const termsResponse = await api.get(`/terms-of-service/active?planId=${formData.planId}`)
      const terms = termsResponse.data

      // 2. Buscar dados do plano para renderizar
      const plan = plans.find(p => p.id === formData.planId)

      // 3. Renderizar termo de uso com variáveis
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

      const renderResponse = await api.post('/terms-of-service/render', {
        termsId: terms.id,
        variables
      })

      setCurrentTerms({
        ...terms,
        content: renderResponse.data.content
      })
      setFormData(prev => ({ ...prev, termsId: terms.id }))
    } catch (err) {
      // Nenhum termo de uso disponível - bloquear cadastro
      setErrors({ terms: 'Nenhum termo de uso disponível no momento. Entre em contato com o suporte.' })
    } finally {
      setLoadingTerms(false)
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
        if (!privacyScrolledToEnd) {
          newErrors.privacyPolicy = 'Role a Política de Privacidade até o final para habilitar o aceite'
        }
        if (!formData.privacyPolicyAccepted) {
          newErrors.privacyPolicyAccepted = 'Você deve aceitar a Política de Privacidade para continuar'
        }
        break

      case 6: // Terms of Service
        if (!termsScrolledToEnd) {
          newErrors.terms = 'Role o Termo de Uso até o final para habilitar o aceite'
        }
        if (!formData.termsAccepted) {
          newErrors.termsAccepted = 'Você deve aceitar o Termo de Uso para continuar'
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

    // Verificar aceite do termo de uso ANTES da validação completa
    if (!formData.termsAccepted) {
      setShowTermsAlert(true)
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

      // Preparar variáveis para substituição no template do termo de uso
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

      // Preparar aceite do termo de uso com variáveis
      const acceptanceResponse = await api.post('/terms-of-service/accept/prepare', {
        termsId: formData.termsId,
        planId: formData.planId,
        ipAddress,
        userAgent,
        variables,
      })

      const acceptanceToken = acceptanceResponse.data.acceptanceToken

      // Enviar dados de registro com token
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { adminPasswordConfirm, addressZip, termsId, termsAccepted, ...rest } = formData
      const dataToSubmit = {
        ...rest,
        addressZipCode: addressZip,
        acceptanceToken,
        // Garantir que paymentMethod tem valor padrão se vazio
        paymentMethod: rest.paymentMethod || 'PIX'
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
      const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpjNumbers}`)
      const data = response.data

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
      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`)
      const data = response.data

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
            className={errors.cnpj ? 'border-danger' : ''}
            disabled={loadingCNPJ}
          />
          {loadingCNPJ && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/70" />
            </div>
          )}
        </div>
        {errors.cnpj && <p className="text-sm text-danger">{errors.cnpj}</p>}
        {!errors.cnpj && !loadingCNPJ && (
          <p className="text-xs text-muted-foreground">
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
          className={errors.name ? 'border-danger' : ''}
          readOnly={!!formData.name && formData.cnpj.length === 18}
        />
        {errors.name && <p className="text-sm text-danger">{errors.name}</p>}
        {formData.name && formData.cnpj.length === 18 && (
          <p className="text-xs text-success">
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
            className={errors.phone ? 'border-danger' : ''}
          />
          {errors.phone && <p className="text-sm text-danger">{errors.phone}</p>}
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
            className={errors.email ? 'border-danger' : ''}
          />
          {errors.email && <p className="text-sm text-danger">{errors.email}</p>}
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
                className={errors.addressZip ? 'border-danger' : ''}
              />
              {errors.addressZip && <p className="text-sm text-danger">{errors.addressZip}</p>}
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="addressStreet">Rua *</Label>
              <Input
                id="addressStreet"
                name="addressStreet"
                value={formData.addressStreet}
                onChange={handleChange}
                placeholder="Rua Exemplo"
                className={errors.addressStreet ? 'border-danger' : ''}
              />
              {errors.addressStreet && <p className="text-sm text-danger">{errors.addressStreet}</p>}
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
                className={errors.addressNumber ? 'border-danger' : ''}
              />
              {errors.addressNumber && <p className="text-sm text-danger">{errors.addressNumber}</p>}
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
                className={errors.addressDistrict ? 'border-danger' : ''}
              />
              {errors.addressDistrict && <p className="text-sm text-danger">{errors.addressDistrict}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressCity">Cidade *</Label>
              <Input
                id="addressCity"
                name="addressCity"
                value={formData.addressCity}
                onChange={handleChange}
                placeholder="São Paulo"
                className={errors.addressCity ? 'border-danger' : ''}
              />
              {errors.addressCity && <p className="text-sm text-danger">{errors.addressCity}</p>}
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
              className={errors.addressState ? 'border-danger' : ''}
            />
            {errors.addressState && <p className="text-sm text-danger">{errors.addressState}</p>}
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
          className={errors.adminName ? 'border-danger' : ''}
        />
        {errors.adminName && <p className="text-sm text-danger">{errors.adminName}</p>}
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
          className={errors.adminCpf ? 'border-danger' : ''}
        />
        {errors.adminCpf && <p className="text-sm text-danger">{errors.adminCpf}</p>}
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
          className={errors.adminEmail ? 'border-danger' : ''}
        />
        {errors.adminEmail && <p className="text-sm text-danger">{errors.adminEmail}</p>}
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
            className={errors.adminPassword ? 'border-danger' : ''}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.adminPassword && <p className="text-sm text-danger">{errors.adminPassword}</p>}
        {!errors.adminPassword && (
          <p className="text-xs text-muted-foreground">
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
            className={errors.adminPasswordConfirm ? 'border-danger' : ''}
          />
          <button
            type="button"
            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
            tabIndex={-1}
          >
            {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.adminPasswordConfirm && <p className="text-sm text-danger">{errors.adminPasswordConfirm}</p>}
      </div>

      <Alert className="bg-primary/5 border-primary/30">
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
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
        </div>
      ) : (
        <RadioGroup value={formData.planId} onValueChange={(value) => setFormData(prev => ({ ...prev, planId: value }))}>
          <div className="grid gap-4">
            {plans.filter(plan => plan.isActive !== false).map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-lg border p-4 transition-shadow",
                  plan.isActive ? "cursor-pointer hover:shadow-md" : "cursor-not-allowed",
                  formData.planId === plan.id ? "border-primary bg-primary/5" : "border-border",
                  plan.isPopular && plan.isActive && "ring-2 ring-blue-500"
                )}
              >
                {/* Overlay para planos inativos */}
                {!plan.isActive && (
                  <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center z-10 backdrop-blur-[1px]">
                    <div className="bg-danger/90 text-white px-4 py-2 rounded-lg shadow-lg font-semibold">
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
                    <span className="absolute -top-3 left-4 bg-primary text-white text-xs px-2 py-1 rounded">
                      Mais Popular
                    </span>
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{plan.displayName}</h3>
                      <p className="text-muted-foreground text-sm">
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
                      {plan.price !== null && Number(plan.price) > 0 && <p className="text-sm text-muted-foreground">/mês</p>}
                      {plan.trialDays > 0 && (
                        <p className="text-sm text-success font-medium mt-1">
                          {plan.trialDays} dias grátis
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mt-3">
                    {featuresToArray(plan.features).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-foreground/80">
                        <Check className="h-4 w-4 text-success flex-shrink-0" />
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

      {errors.planId && <p className="text-sm text-danger">{errors.planId}</p>}
    </div>
  )

  // Step 4: Declarações LGPD
  const renderStep4 = () => (
    <div className="space-y-6">
      <Alert className="bg-primary/5 border-primary/30">
        <AlertDescription>
          <strong>Contexto Legal LGPD:</strong> Antes de prosseguir, é importante esclarecer os papéis e responsabilidades conforme a Lei Geral de Proteção de Dados (LGPD).
        </AlertDescription>
      </Alert>

      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-primary/30">
        <div className="space-y-4 text-sm">
          <p className="font-medium text-primary/95">
            <strong>Entenda os papéis LGPD:</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 text-primary/90">
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
            <p className="text-xs text-muted-foreground mt-1">
              A ILPI define as finalidades e é responsável pela coleta, uso e armazenamento dos dados de saúde e pessoais dos residentes.
            </p>
          </div>
        </div>
        {errors.lgpdIsDataController && (
          <p className="text-sm text-danger">{errors.lgpdIsDataController}</p>
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
            <p className="text-xs text-muted-foreground mt-1">
              A ILPI possui autorização legal (Termos de Uso com responsáveis legais, tutela, curatela ou consentimento) para coletar e tratar dados pessoais sensíveis de saúde.
            </p>
          </div>
        </div>
        {errors.lgpdHasLegalBasis && (
          <p className="text-sm text-danger">{errors.lgpdHasLegalBasis}</p>
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
            <p className="text-xs text-muted-foreground mt-1">
              A ILPI é responsável por: obter consentimento dos titulares/responsáveis legais, garantir exatidão dos dados, comunicar incidentes à ANPD, atender solicitações de titulares (acesso, retificação, exclusão), e manter conformidade com LGPD, RDC 502/2021 ANVISA e CFM 1.821/2007.
            </p>
          </div>
        </div>
        {errors.lgpdAcknowledgesResponsibility && (
          <p className="text-sm text-danger">{errors.lgpdAcknowledgesResponsibility}</p>
        )}
      </div>
    </div>
  )

  // Step 5: Política de Privacidade
  const renderStep5 = () => (
    <div className="space-y-6">
      <Alert className="bg-primary/5 border-primary/30">
        <AlertDescription>
          Leia atentamente a Política de Privacidade antes de continuar. <strong>Role o conteúdo até o final para habilitar o aceite.</strong>
        </AlertDescription>
      </Alert>

      {/* Status de leitura por rolagem */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-primary/30">
        <span className="text-sm font-medium text-primary/95">
          {privacyScrolledToEnd ? '✅ Leitura concluída' : '⬇️ Role até o final da Política de Privacidade'}
        </span>
        <span className={cn(
          "text-lg font-bold",
          privacyScrolledToEnd ? "text-success" : "text-primary"
        )}>
          {privacyScrolledToEnd ? '100%' : '<98%'}
        </span>
      </div>

      {loadingPrivacyPolicy ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : privacyPolicy ? (
        <Card
          ref={privacyContentRef}
          onScroll={handlePrivacyScroll}
          className="p-6 max-h-96 overflow-y-auto border-2"
        >
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

      <div className="flex items-start space-x-2 p-4 bg-muted/50 rounded-lg">
        <Checkbox
          id="privacyPolicyAccepted"
          checked={formData.privacyPolicyAccepted}
          disabled={!privacyScrolledToEnd}
          onCheckedChange={(checked) =>
            setFormData(prev => ({ ...prev, privacyPolicyAccepted: !!checked }))
          }
        />
        <label
          htmlFor="privacyPolicyAccepted"
          className={cn(
            "text-sm leading-relaxed cursor-pointer",
            !privacyScrolledToEnd && "text-muted-foreground/70 cursor-not-allowed"
          )}
        >
          Li e aceito a Política de Privacidade da plataforma RAFA ILPI
        </label>
      </div>
      {errors.privacyPolicyAccepted && (
        <p className="text-sm text-danger">{errors.privacyPolicyAccepted}</p>
      )}

      <div className="text-center">
        <a
          href="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:text-primary/90 underline"
        >
          Abrir Política de Privacidade em nova aba
        </a>
      </div>
    </div>
  )

  // Step 6: Aceite do Termo de Uso (antes era Step 4)
  const renderStep6 = () => (
    <div className="space-y-6">
      <Alert className="bg-primary/5 border-primary/30">
        <AlertDescription>
          Leia atentamente os Termos de Uso antes de continuar. <strong>Role o conteúdo até o final para habilitar o aceite.</strong>
        </AlertDescription>
      </Alert>

      {/* Status de leitura por rolagem */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-primary/30">
        <span className="text-sm font-medium text-primary/95">
          {termsScrolledToEnd ? '✅ Leitura concluída' : '⬇️ Role até o final dos Termos de Uso'}
        </span>
        <span className={cn(
          "text-lg font-bold",
          termsScrolledToEnd ? "text-success" : "text-primary"
        )}>
          {termsScrolledToEnd ? '100%' : '<98%'}
        </span>
      </div>

      {loadingTerms ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : currentTerms ? (
        <Card
          ref={termsContentRef}
          onScroll={handleTermsScroll}
          className="p-6 max-h-96 overflow-y-auto border-2"
        >
          <div dangerouslySetInnerHTML={{ __html: currentTerms.content }} />
        </Card>
      ) : null}

      {errors.terms && (
        <Alert variant="destructive">
          <AlertDescription>{errors.terms}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-start space-x-2 p-4 bg-muted/50 rounded-lg">
        <Checkbox
          id="termsAccepted"
          checked={formData.termsAccepted}
          disabled={!termsScrolledToEnd}
          onCheckedChange={(checked) =>
            setFormData(prev => ({ ...prev, termsAccepted: !!checked }))
          }
        />
        <label
          htmlFor="termsAccepted"
          className={cn(
            "text-sm leading-relaxed cursor-pointer",
            !termsScrolledToEnd && "text-muted-foreground/70 cursor-not-allowed"
          )}
        >
          Li e aceito os Termos de Uso da plataforma RAFA ILPI
        </label>
      </div>
      {errors.termsAccepted && (
        <p className="text-sm text-danger">{errors.termsAccepted}</p>
      )}
    </div>
  )

  // Step 7: Dados de Cobrança
  const renderStep7 = () => {
    const selectedPlan = plans.find(p => p.id === formData.planId)
    if (!selectedPlan) return null

    const monthlyPrice = selectedPlan.price ? Number(selectedPlan.price) : 0
    const annualDiscount = selectedPlan.annualDiscountPercent ? Number(selectedPlan.annualDiscountPercent) : 0
    const annualPriceMonthly = monthlyPrice * 12
    const annualPriceWithDiscount = annualPriceMonthly * (1 - annualDiscount / 100)
    const savings = annualPriceMonthly - annualPriceWithDiscount
    const hasPrice = selectedPlan.price && Number(selectedPlan.price) > 0

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">💳 Dados de Cobrança</h2>
          <p className="text-slate-600 mt-2">
            Revise o plano selecionado e complete as informações para finalizar
          </p>
        </div>

        {/* Seção 1: Resumo do Plano Selecionado */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-primary/30">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-primary/80 mb-1">📦 Plano Selecionado</p>
              <h3 className="text-2xl font-bold text-slate-900">{selectedPlan.displayName}</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(3)}
              className="text-primary hover:text-primary/80"
            >
              ✏️ Alterar Plano
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white/60 rounded-lg p-3">
              <p className="text-xs text-slate-600 mb-1">Valor Mensal</p>
              <p className="text-lg font-bold text-slate-900">
                {hasPrice ? `R$ ${monthlyPrice.toFixed(2)}` : 'Grátis'}
              </p>
            </div>
            {hasPrice && (
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-xs text-slate-600 mb-1">Valor Anual</p>
                <p className="text-lg font-bold text-slate-900">
                  R$ {annualPriceMonthly.toFixed(2)}
                  {annualDiscount > 0 && (
                    <span className="ml-2 text-xs text-success font-medium">
                      (-{annualDiscount}%)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Seção Colapsável de Features */}
          <details className="group">
            <summary className="cursor-pointer flex items-center justify-center gap-2 text-sm text-primary font-medium hover:text-primary/80 transition-colors">
              <span>Saiba mais sobre o plano</span>
              <span className="transform transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="mt-4 space-y-2 text-sm border-t pt-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-4 w-4 text-success flex-shrink-0" />
                <span>{selectedPlan.maxUsers === -1 ? 'Usuários ilimitados' : `Até ${selectedPlan.maxUsers} usuários`}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-4 w-4 text-success flex-shrink-0" />
                <span>{selectedPlan.maxResidents === -1 ? 'Residentes ilimitados' : `Até ${selectedPlan.maxResidents} residentes`}</span>
              </div>
              {selectedPlan.trialDays > 0 && (
                <div className="flex items-center gap-2 text-success font-medium">
                  <Check className="h-4 w-4 text-success flex-shrink-0" />
                  <span>{selectedPlan.trialDays} dias de teste grátis</span>
                </div>
              )}

              {/* Features do plano */}
              <div className="pt-3 border-t">
                <p className="text-xs text-slate-600 mb-2 font-medium">Funcionalidades incluídas:</p>
                {featuresToArray(selectedPlan.features).map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-700 py-1">
                    <Check className="h-4 w-4 text-success flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </Card>

        {/* Seção 2: Ciclo de Cobrança (só aparece se plano tem preço) */}
        {hasPrice && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Ciclo de Cobrança</Label>
            <RadioGroup
              value={formData.billingCycle}
              onValueChange={(value) => setFormData(prev => ({ ...prev, billingCycle: value as 'MONTHLY' | 'ANNUAL' }))}
            >
              {/* Opção Mensal */}
              <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <RadioGroupItem value="MONTHLY" id="monthly" />
                <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">💳 Mensal</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {monthlyPrice.toFixed(2)}/mês
                    </p>
                  </div>
                </Label>
              </div>

              {/* Opção Anual */}
              {annualDiscount > 0 ? (
                <div className="flex items-center space-x-2 border-2 border-success rounded-lg p-4 bg-success/5 hover:bg-success/10 transition-colors cursor-pointer">
                  <RadioGroupItem value="ANNUAL" id="annual" />
                  <Label htmlFor="annual" className="flex-1 cursor-pointer">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">🎉 Anual</p>
                        <span className="bg-success/60 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                          Economize {annualDiscount}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        R$ {annualPriceWithDiscount.toFixed(2)}/ano
                        <span className="ml-2 line-through text-muted-foreground/70">
                          R$ {annualPriceMonthly.toFixed(2)}
                        </span>
                      </p>
                      <p className="text-xs text-success/80 font-medium mt-1">
                        💰 Você economiza R$ {savings.toFixed(2)} por ano
                      </p>
                    </div>
                  </Label>
                </div>
              ) : (
                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="ANNUAL" id="annual" />
                  <Label htmlFor="annual" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">📅 Anual</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {annualPriceMonthly.toFixed(2)}/ano
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pagamento único anual
                      </p>
                    </div>
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>
        )}

        {/* Seção 3: Método de Pagamento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Método de Pagamento Preferido</Label>
            {formData.paymentMethod && (
              <p className="text-xs text-muted-foreground italic">
                Você poderá alterar posteriormente
              </p>
            )}
          </div>

          <RadioGroup
            value={formData.paymentMethod}
            onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value as 'PIX' | 'BOLETO' | 'CREDIT_CARD' }))}
          >
            {/* PIX - Apenas para ANNUAL */}
            {formData.billingCycle === 'ANNUAL' && (
              <div className="flex items-center space-x-2 border-2 border-[#059669] rounded-lg p-4 hover:bg-muted/50 cursor-pointer relative">
                <RadioGroupItem value="PIX" id="pix" />
                <Label htmlFor="pix" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">⚡</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">PIX</p>
                        <span className="inline-flex items-center rounded-full bg-[#059669] px-2 py-0.5 text-xs font-medium text-white">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Confirmação instantânea • Apenas pagamento anual
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
            )}

            {/* Boleto */}
            <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="BOLETO" id="boleto" />
              <Label htmlFor="boleto" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-severity-warning/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🧾</span>
                  </div>
                  <div>
                    <p className="font-medium">Boleto Bancário</p>
                    <p className="text-sm text-muted-foreground">
                      Confirmação em até 3 dias úteis
                    </p>
                  </div>
                </div>
              </Label>
            </div>

            {/* Cartão de Crédito - DESABILITADO temporariamente */}
            {/* <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer opacity-50">
              <RadioGroupItem value="CREDIT_CARD" id="credit-card" disabled />
              <Label htmlFor="credit-card" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💳</span>
                  </div>
                  <div>
                    <p className="font-medium">Cartão de Crédito</p>
                    <p className="text-sm text-muted-foreground">
                      Renovação automática mensal (em breve)
                    </p>
                  </div>
                </div>
              </Label>
            </div> */}
          </RadioGroup>

          {/* Aviso PIX para planos mensais */}
          {formData.billingCycle === 'MONTHLY' && (
            <div className="rounded-lg bg-[#059669]/10 border border-[#059669]/20 p-3">
              <p className="text-sm text-[#059669]">
                💡 <strong>PIX disponível para pagamento anual.</strong> Selecione "Anual" acima para habilitar PIX como método de pagamento.
              </p>
            </div>
          )}

          {errors.paymentMethod && (
            <p className="text-sm text-danger">{errors.paymentMethod}</p>
          )}
        </div>

        {/* Seção 4: Dados de Cobrança (ILPI) */}
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                📋 Dados de Cobrança (ILPI)
              </p>
              <div className="space-y-1 text-sm text-slate-600">
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
              className="text-primary hover:text-primary/80"
            >
              ✏️ Editar
            </Button>
          </div>
        </Card>

        {/* Disclaimer LGPD sobre Asaas */}
        <Card className="p-4 bg-muted/50 border-border">
          <p className="text-xs text-muted-foreground">
            🔒 <strong>Segurança e Privacidade:</strong> Os dados de pagamento são processados
            exclusivamente pela <strong>Asaas Gestão Financeira</strong>, operadora de pagamentos
            certificada PCI-DSS nível 1. A Rafa Labs não armazena dados de cartão de crédito.
          </p>
        </Card>
      </div>
    )
  }

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
                        ? "bg-primary/60 text-white"
                        : "bg-muted/20 text-muted-foreground"
                    )}
                  >
                    {step}
                  </div>
                  {step < 7 && (
                    <div
                      className={cn(
                        "w-8 h-1",
                        currentStep > step ? "bg-primary/60" : "bg-muted/20"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center mt-2 text-sm text-muted-foreground">
            {currentStep === 1 && "Dados da ILPI"}
            {currentStep === 2 && "Administrador"}
            {currentStep === 3 && "Escolha o Plano"}
            {currentStep === 4 && "Declarações LGPD"}
            {currentStep === 5 && "Política de Privacidade"}
            {currentStep === 6 && "Termos de Uso"}
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
      <AlertDialog open={showTermsAlert} onOpenChange={setShowTermsAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Aceite do Termo de Uso Necessário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Para prosseguir com a criação da conta, você precisa ler e aceitar o Termos de Uso.
              <br /><br />
              Por favor, marque a caixa de seleção <strong>"Li e aceito o Termo de Uso"</strong> antes de clicar em "Criar conta".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowTermsAlert(false)}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
