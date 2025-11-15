import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { api } from '../../services/api'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import { cn } from '../../lib/utils'

interface Plan {
  id: string
  name: string
  displayName: string
  price: number
  maxUsers: number
  maxResidents: number
  features: string[]
  trialDays: number
  isPopular?: boolean
}

export default function Register() {
  const navigate = useNavigate()
  const { register, isLoading, error, clearError, isAuthenticated } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(1)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

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
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',

    // Plan
    planId: ''
  })

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

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1: // ILPI Data
        if (!formData.name) newErrors.name = 'Nome da ILPI é obrigatório'
        if (!formData.email) newErrors.email = 'Email é obrigatório'
        if (!formData.phone) newErrors.phone = 'Telefone é obrigatório'
        if (!formData.addressZip) newErrors.addressZip = 'CEP é obrigatório'
        if (!formData.addressStreet) newErrors.addressStreet = 'Rua é obrigatória'
        if (!formData.addressNumber) newErrors.addressNumber = 'Número é obrigatório'
        if (!formData.addressDistrict) newErrors.addressDistrict = 'Bairro é obrigatório'
        if (!formData.addressCity) newErrors.addressCity = 'Cidade é obrigatória'
        if (!formData.addressState) newErrors.addressState = 'Estado é obrigatório'
        break

      case 2: // Admin Data
        if (!formData.adminName) newErrors.adminName = 'Nome do administrador é obrigatório'
        if (!formData.adminEmail) newErrors.adminEmail = 'Email do administrador é obrigatório'
        if (!formData.adminPassword) newErrors.adminPassword = 'Senha é obrigatória'
        if (formData.adminPassword.length < 8) newErrors.adminPassword = 'Senha deve ter no mínimo 8 caracteres'
        if (formData.adminPassword !== formData.adminPasswordConfirm) {
          newErrors.adminPasswordConfirm = 'As senhas não coincidem'
        }
        break

      case 3: // Plan
        if (!formData.planId) newErrors.planId = 'Selecione um plano'
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

    if (!validateStep(currentStep)) return

    clearError()

    try {
      const { adminPasswordConfirm, ...dataToSubmit } = formData
      await register(dataToSubmit)
      navigate('/dashboard')
    } catch (err) {
      // Erro já tratado no store
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Limpar erro do campo ao digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
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
        <Label htmlFor="name">Nome da ILPI *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Casa de Repouso Exemplo"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            name="cnpj"
            value={formData.cnpj}
            onChange={handleChange}
            placeholder="00.000.000/0000-00"
            maxLength={18}
          />
        </div>

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
                  "relative rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow",
                  formData.planId === plan.id ? "border-blue-500 bg-blue-50" : "border-gray-200",
                  plan.isPopular && "ring-2 ring-blue-500"
                )}
              >
                <RadioGroupItem value={plan.id} id={plan.id} className="sr-only" />
                <Label htmlFor={plan.id} className="cursor-pointer">
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
                        {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                      </p>
                      {plan.price > 0 && <p className="text-sm text-gray-500">/mês</p>}
                      {plan.trialDays > 0 && (
                        <p className="text-sm text-green-600 font-medium mt-1">
                          {plan.trialDays} dias grátis
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mt-3">
                    {plan.features.map((feature, idx) => (
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
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                      currentStep >= step
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    )}
                  >
                    {step}
                  </div>
                  {step < 3 && (
                    <div
                      className={cn(
                        "w-16 h-1",
                        currentStep > step ? "bg-blue-600" : "bg-gray-200"
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex justify-center mt-2 text-sm text-gray-600">
            {currentStep === 1 && "Dados da ILPI"}
            {currentStep === 2 && "Administrador"}
            {currentStep === 3 && "Escolha o Plano"}
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

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

            {currentStep < 3 ? (
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
    </div>
  )
}