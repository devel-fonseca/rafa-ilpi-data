import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { ArrowLeft, ArrowRight, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Stepper } from '@/components/ui/stepper'
import { useCreatePrescription, useUpdatePrescription } from '@/hooks/usePrescriptions'
import { uploadFile } from '@/services/upload'
import { toast } from 'sonner'
import type { CreatePrescriptionDto } from '@/api/prescriptions.api'
import { getCurrentDate } from '@/utils/dateHelpers'
import { Page, PageHeader } from '@/design-system/components'

// Importar os steps (serão criados a seguir)
import { Step1ResidentInfo } from './form/Step1ResidentInfo'
import { Step2PrescriberInfo } from './form/Step2PrescriberInfo'
import { Step3Medications } from './form/Step3Medications'
import { Step4SOSMedications } from './form/Step4SOSMedications'
import { Step5Review } from './form/Step5Review'
import { getErrorMessage } from '@/utils/errorHandling'

const STEPS = [
  { id: 1, title: 'Residente', description: 'Dados do residente' },
  { id: 2, title: 'Prescritor', description: 'Informações do médico' },
  { id: 3, title: 'Medicamentos', description: 'Medicações contínuas' },
  { id: 4, title: 'SOS', description: 'Medicações se necessário' },
  { id: 5, title: 'Revisão', description: 'Revisar e finalizar' },
]

export default function PrescriptionForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const residentId = searchParams.get('residentId')

  const [currentStep, setCurrentStep] = useState(0)
  const isEditing = id && id !== 'new'

  // Form methods
  const methods = useForm<CreatePrescriptionDto>({
    defaultValues: {
      residentId: residentId || '',
      doctorName: '',
      doctorCrm: '',
      doctorCrmState: '',
      prescriptionDate: getCurrentDate(),
      prescriptionType: 'ROTINA',
      medications: [],
      sosMedications: [],
    },
  })

  const createMutation = useCreatePrescription()
  const updateMutation = useUpdatePrescription()

  const onSubmit = async (data: CreatePrescriptionDto) => {
    try {
      let prescriptionImageUrl: string | undefined

      // Upload da imagem da prescrição (se houver)
      if (data.prescriptionImage && data.prescriptionImage instanceof File) {
        toast.info('Enviando imagem da prescrição...')
        prescriptionImageUrl = await uploadFile(data.prescriptionImage, 'medical', data.residentId)
      }

      // Limpar campos de data vazios (converter "" para undefined)
      const sanitizedData = {
        ...data,
        prescriptionImageUrl,
        prescriptionImage: undefined, // Remover o File do payload
        validUntil: data.validUntil || undefined,
        reviewDate: data.reviewDate || undefined,
        medications: data.medications.map((med) => ({
          ...med,
          endDate: med.endDate || undefined,
        })),
        sosMedications: data.sosMedications?.map((med) => ({
          ...med,
          endDate: med.endDate || undefined,
        })),
      }

      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, data: sanitizedData })
        toast.success('Prescrição atualizada com sucesso!')
      } else {
        await createMutation.mutateAsync(sanitizedData)
        toast.success('Prescrição criada com sucesso!')
      }
      navigate('/dashboard/prescricoes')
    } catch (error: unknown) {
      toast.error(error?.response?.data?.message || 'Erro ao salvar prescrição')
    }
  }

  const handleNext = async () => {
    // Validar step atual antes de avançar
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await methods.trigger(fieldsToValidate as any)

    if (isValid) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        // Último step - submeter form
        methods.handleSubmit(onSubmit)()
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else {
      navigate('/dashboard/prescricoes')
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <Step1ResidentInfo />
      case 1:
        return <Step2PrescriberInfo />
      case 2:
        return <Step3Medications />
      case 3:
        return <Step4SOSMedications />
      case 4:
        return <Step5Review />
      default:
        return null
    }
  }

  return (
    <FormProvider {...methods}>
      <Page>
        <PageHeader
          title={isEditing ? 'Editar Prescrição' : 'Nova Prescrição'}
          subtitle="Preencha os dados da prescrição médica"
          onBack={() => navigate('/dashboard/prescricoes')}
        />

        {/* Stepper */}
        <Stepper steps={STEPS} currentStep={currentStep} />

        {/* Form Content */}
        <Card>
          <CardContent className="p-6">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 0 ? 'Cancelar' : 'Voltar'}
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {currentStep === STEPS.length - 1 ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Prescrição
              </>
            ) : (
              <>
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </Page>
    </FormProvider>
  )
}

// Helper para validação por step
function getFieldsForStep(step: number): string[] {
  switch (step) {
    case 0:
      return ['residentId']
    case 1:
      return ['doctorName', 'doctorCrm', 'doctorCrmState', 'prescriptionDate', 'prescriptionType']
    case 2:
      return ['medications']
    case 3:
      return ['sosMedications']
    case 4:
      return []
    default:
      return []
  }
}
