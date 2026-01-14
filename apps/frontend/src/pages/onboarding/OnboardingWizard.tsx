import { useState, useEffect } from 'react'
import { WelcomeScreen } from './WelcomeScreen'
import { BasicInfoStep } from './steps/BasicInfoStep'
import { CapacityStep } from './steps/CapacityStep'
import { BrandingStep } from './steps/BrandingStep'
import { StructureGeneratorInstructions } from './StructureGeneratorInstructions'
import { BuildingStructureGeneratorWrapper } from './BuildingStructureGeneratorWrapper'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

/**
 * Tipos de dados do formulário de onboarding
 */
export interface OnboardingFormData {
  // Step 1: Básicos
  legalNature?: 'ASSOCIACAO' | 'FUNDACAO' | 'EMPRESA_PRIVADA' | 'MEI'
  tradeName?: string
  foundedAt?: string
  websiteUrl?: string
  contactPhone?: string
  contactEmail?: string

  // Step 2: Capacidade e regulatório
  cnesCode?: string
  capacityDeclared?: number
  capacityLicensed?: number
  notes?: string

  // Step 3: Identidade visual
  logoUrl?: string
  logoKey?: string
  mission?: string
  vision?: string
  values?: string
}

/**
 * Fluxo completo de onboarding para novo tenant
 *
 * Fluxo:
 * 1. Tela de boas-vindas (WelcomeScreen)
 * 2. Wizard de 3 steps (BasicInfo → Capacity → Branding)
 * 3. Instruções para gerador de estrutura
 * 4. BuildingStructureGenerator (componente existente)
 * 5. Redirect para dashboard
 */
export function OnboardingWizard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'wizard' | 'instructions' | 'generator' | 'complete'>('welcome')
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<OnboardingFormData>({
    legalNature: 'EMPRESA_PRIVADA', // Padrão: maioria das ILPIs
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Busca dados do tenant para pré-preencher telefone e email
   */
  useEffect(() => {
    const fetchTenantData = async () => {
      try {
        if (user?.tenantId) {
          const response = await api.get(`/tenants/${user.tenantId}`)
          const tenant = response.data

          // Pré-preencher telefone e email do cadastro
          setFormData((prev) => ({
            ...prev,
            contactPhone: tenant.phone || '',
            contactEmail: tenant.email || '',
          }))
        }
      } catch (error) {
        console.error('Erro ao buscar dados do tenant:', error)
        // Continuar sem pré-preencher (não é crítico)
      }
    }

    fetchTenantData()
  }, [user?.tenantId])

  /**
   * Atualiza dados do formulário (parcial)
   */
  const updateFormData = (data: Partial<OnboardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  /**
   * Inicia o wizard após welcome screen
   */
  const handleStartWizard = () => {
    setCurrentScreen('wizard')
    setCurrentStep(1)
  }

  /**
   * Avança para próximo step do wizard
   */
  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1)
    } else {
      // Finaliza wizard, submete dados
      handleSubmitProfile()
    }
  }

  /**
   * Volta para step anterior
   */
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  /**
   * Submete perfil institucional para o backend
   */
  const handleSubmitProfile = async () => {
    setIsSubmitting(true)

    try {
      // Validação: legalNature é obrigatório
      if (!formData.legalNature) {
        toast.error('Natureza jurídica é obrigatória')
        setCurrentStep(1)
        setIsSubmitting(false)
        return
      }

      // 1. Criar/atualizar perfil institucional
      await api.post('/tenant-profile', formData)

      // 2. Upload do logo (se houver arquivo selecionado)
      if (logoFile) {
        try {
          const formData = new FormData()
          formData.append('file', logoFile)

          await api.post('/institutional-profile/logo', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })

          toast.success('Perfil e logo salvos com sucesso! 🎉')
        } catch (logoError: any) {
          console.error('Erro ao fazer upload do logo:', logoError)
          toast.warning('Perfil criado, mas houve erro ao salvar o logo. Você pode adicioná-lo depois.')
        }
      } else {
        toast.success('Perfil institucional criado com sucesso! 🎉')
      }

      // Avança para instruções do gerador
      setCurrentScreen('instructions')
    } catch (error: any) {
      console.error('Erro ao criar perfil:', error)
      toast.error(error.response?.data?.message || 'Erro ao criar perfil institucional')
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Avança para o gerador de estrutura
   */
  const handleOpenGenerator = () => {
    setCurrentScreen('generator')
  }

  /**
   * Pula gerador de estrutura e vai direto para o dashboard
   */
  const handleSkipGenerator = () => {
    toast.info('Você pode criar a estrutura física depois em Estrutura de Leitos')
    navigate('/dashboard')
  }

  /**
   * Finaliza gerador de estrutura e redireciona para dashboard
   */
  const handleFinishGenerator = () => {
    toast.success('Onboarding concluído! Bem-vindo ao Rafa ILPI! 🚀')
    navigate('/dashboard')
  }

  // ============================================================
  // RENDERIZAÇÃO CONDICIONAL POR TELA
  // ============================================================

  // Tela 1: Boas-vindas
  if (currentScreen === 'welcome') {
    return (
      <WelcomeScreen
        tenantName={user?.tenant?.name || 'Sua Instituição'}
        onStart={handleStartWizard}
      />
    )
  }

  // Tela 2: Wizard (3 steps)
  if (currentScreen === 'wizard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <div className="max-w-3xl w-full">
          {/* Step 1: Dados Básicos */}
          {currentStep === 1 && (
            <BasicInfoStep
              data={formData}
              onUpdate={updateFormData}
              onNext={handleNextStep}
              onBack={() => setCurrentScreen('welcome')}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Step 2: Capacidade e Regulatório */}
          {currentStep === 2 && (
            <CapacityStep
              data={formData}
              onUpdate={updateFormData}
              onNext={handleNextStep}
              onBack={handlePreviousStep}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Step 3: Identidade Visual */}
          {currentStep === 3 && (
            <BrandingStep
              data={formData}
              onUpdate={updateFormData}
              onNext={handleNextStep}
              onBack={handlePreviousStep}
              isSubmitting={isSubmitting}
              logoFile={logoFile}
              onLogoFileChange={setLogoFile}
            />
          )}
        </div>
      </div>
    )
  }

  // Tela 3: Instruções para gerador
  if (currentScreen === 'instructions') {
    return (
      <StructureGeneratorInstructions
        onProceed={handleOpenGenerator}
        onSkip={handleSkipGenerator}
      />
    )
  }

  // Tela 4: Gerador de estrutura física
  if (currentScreen === 'generator') {
    return (
      <BuildingStructureGeneratorWrapper
        onComplete={handleFinishGenerator}
        onCancel={handleSkipGenerator}
      />
    )
  }

  // Fallback (não deve acontecer)
  return null
}
