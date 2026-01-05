import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileCheck, AlertTriangle, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SingleFileUpload } from '@/components/form/SingleFileUpload'
import { useRecordMedicalReview } from '@/hooks/usePrescriptions'
import { uploadFile } from '@/services/upload'
import { useToast } from '@/components/ui/use-toast'
import { getErrorMessage } from '@/utils/errorHandling'

/**
 * Lista de estados brasileiros (UF)
 */
const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

/**
 * Schema de validação para revisão médica de prescrição
 * Sincronizado com backend: MedicalReviewPrescriptionDto
 */
const medicalReviewSchema = z.object({
  medicalReviewDate: z
    .string()
    .min(1, 'Data da consulta é obrigatória')
    .refine((date) => {
      const reviewDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return reviewDate <= today
    }, 'Data da consulta não pode ser futura'),

  reviewedByDoctor: z
    .string()
    .min(3, 'Nome do médico é obrigatório (mínimo 3 caracteres)'),

  reviewDoctorCrm: z
    .string()
    .min(4, 'CRM é obrigatório (mínimo 4 caracteres)'),

  reviewDoctorState: z
    .string()
    .length(2, 'UF deve ter exatamente 2 caracteres')
    .refine((uf) => BRAZILIAN_STATES.includes(uf), 'UF inválida'),

  prescriptionImage: z
    .instanceof(File, { message: 'Upload da prescrição é obrigatório' })
    .nullable()
    .refine((file) => file !== null, { message: 'Upload da prescrição é obrigatório' }),

  newReviewDate: z
    .string()
    .optional()
    .refine((date) => {
      if (!date) return true
      const reviewDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return reviewDate > today
    }, 'Próxima revisão deve ser uma data futura'),

  reviewNotes: z
    .string()
    .refine(
      (value) => {
        const cleaned = value.replace(/\s+/g, '')
        return cleaned.length >= 10
      },
      { message: 'Observações devem ter pelo menos 10 caracteres (sem contar espaços)' }
    ),
})

type MedicalReviewFormData = z.infer<typeof medicalReviewSchema>

interface MedicalReviewModalProps {
  prescriptionId: string
  residentId: string
  open: boolean
  onClose: () => void
}

/**
 * Modal para registrar revisão médica de prescrição
 * Usado quando médico examina residente e emite nova receita (mesma prescrição)
 *
 * Fluxo:
 * 1. RT/Enfermeiro agenda consulta médica para residente
 * 2. Médico examina residente e emite nova receita (mesma prescrição)
 * 3. RT/Enfermeiro registra no sistema via este modal
 *
 * IMPORTANTE: Este modal NÃO altera medicamentos. Se houve mudança de medicação,
 * o correto é inativar a prescrição antiga e criar uma nova.
 *
 * @example
 * ```tsx
 * <MedicalReviewModal
 *   prescriptionId="123"
 *   residentId="456"
 *   open={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 * />
 * ```
 */
export function MedicalReviewModal({
  prescriptionId,
  residentId,
  open,
  onClose,
}: MedicalReviewModalProps) {
  const { toast } = useToast()
  const recordReview = useRecordMedicalReview()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<MedicalReviewFormData>({
    resolver: zodResolver(medicalReviewSchema),
    defaultValues: {
      medicalReviewDate: new Date().toISOString().split('T')[0],
      reviewedByDoctor: '',
      reviewDoctorCrm: '',
      reviewDoctorState: '',
      prescriptionImage: null,
      newReviewDate: '',
      reviewNotes: '',
    },
  })

  const reviewNotes = watch('reviewNotes')
  const cleanedLength = reviewNotes?.replace(/\s+/g, '').length || 0

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (data: MedicalReviewFormData) => {
    try {
      let prescriptionImageUrl: string | undefined

      // Upload da prescrição (obrigatório)
      if (data.prescriptionImage && data.prescriptionImage instanceof File) {
        toast({
          title: 'Enviando prescrição...',
          description: 'Aguarde enquanto fazemos o upload.',
        })
        prescriptionImageUrl = await uploadFile(data.prescriptionImage, 'medical', residentId)
      }

      if (!prescriptionImageUrl) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'É necessário fazer upload da prescrição.',
        })
        return
      }

      await recordReview.mutateAsync({
        id: prescriptionId,
        data: {
          medicalReviewDate: data.medicalReviewDate,
          reviewedByDoctor: data.reviewedByDoctor,
          reviewDoctorCrm: data.reviewDoctorCrm,
          reviewDoctorState: data.reviewDoctorState,
          prescriptionImageUrl,
          newReviewDate: data.newReviewDate || undefined,
          reviewNotes: data.reviewNotes,
        },
      })

      toast({
        title: 'Revisão médica registrada',
        description: 'A revisão médica foi registrada com sucesso no histórico da prescrição.',
      })

      handleClose()
    } catch (error) {
      console.error('Erro ao registrar revisão médica:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar',
        description: getErrorMessage(error, 'Não foi possível registrar a revisão médica. Tente novamente.'),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Registrar Revisão Médica
          </DialogTitle>
          <DialogDescription>
            Registre a consulta médica e a nova receita emitida. Este registro será auditado e fará parte do histórico do prontuário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Alerta Informativo */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Este formulário é para registrar revisões médicas onde a prescrição permanece a mesma.
              Se houve mudança de medicação, você deve inativar a prescrição antiga e criar uma nova.
            </AlertDescription>
          </Alert>

          {/* Seção: Dados da Consulta Médica */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Dados da Consulta Médica
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Data da Consulta */}
              <div className="space-y-2">
                <Label htmlFor="medicalReviewDate">
                  Data da Consulta *
                </Label>
                <Input
                  id="medicalReviewDate"
                  type="date"
                  {...register('medicalReviewDate')}
                  max={new Date().toISOString().split('T')[0]}
                  className={errors.medicalReviewDate ? 'border-red-500' : ''}
                />
                {errors.medicalReviewDate && (
                  <p className="text-sm text-red-500">{errors.medicalReviewDate.message}</p>
                )}
              </div>

              {/* Próxima Revisão (opcional) */}
              <div className="space-y-2">
                <Label htmlFor="newReviewDate">
                  Próxima Revisão (Opcional)
                </Label>
                <Input
                  id="newReviewDate"
                  type="date"
                  {...register('newReviewDate')}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  className={errors.newReviewDate ? 'border-red-500' : ''}
                />
                {errors.newReviewDate && (
                  <p className="text-sm text-red-500">{errors.newReviewDate.message}</p>
                )}
              </div>
            </div>

            {/* Nome do Médico */}
            <div className="space-y-2">
              <Label htmlFor="reviewedByDoctor">
                Nome do Médico *
              </Label>
              <Input
                id="reviewedByDoctor"
                placeholder="Ex: Dr. João Silva"
                {...register('reviewedByDoctor')}
                className={errors.reviewedByDoctor ? 'border-red-500' : ''}
              />
              {errors.reviewedByDoctor && (
                <p className="text-sm text-red-500">{errors.reviewedByDoctor.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CRM */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reviewDoctorCrm">
                  CRM *
                </Label>
                <Input
                  id="reviewDoctorCrm"
                  placeholder="Ex: 123456"
                  {...register('reviewDoctorCrm')}
                  className={errors.reviewDoctorCrm ? 'border-red-500' : ''}
                />
                {errors.reviewDoctorCrm && (
                  <p className="text-sm text-red-500">{errors.reviewDoctorCrm.message}</p>
                )}
              </div>

              {/* UF */}
              <div className="space-y-2">
                <Label htmlFor="reviewDoctorState">
                  UF *
                </Label>
                <Controller
                  name="reviewDoctorState"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        className={errors.reviewDoctorState ? 'border-red-500' : ''}
                      >
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.reviewDoctorState && (
                  <p className="text-sm text-red-500">{errors.reviewDoctorState.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Seção: Upload da Prescrição */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              Upload da Nova Prescrição
            </h3>

            <SingleFileUpload
              onFileSelect={(file) => setValue('prescriptionImage', file)}
              accept="image/*,application/pdf"
              maxSize={10}
              label="Prescrição"
              description="Envie a nova prescrição emitida pelo médico (PDF ou imagem, máx 10MB)"
              required
              disabled={recordReview.isPending}
              error={errors.prescriptionImage?.message}
            />
          </div>

          {/* Seção: Observações */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-sm">Observações da Revisão</h3>

            <div className="space-y-2">
              <Label htmlFor="reviewNotes">
                Observações *
              </Label>
              <Textarea
                id="reviewNotes"
                placeholder="Ex: Dr. João confirmou mesma prescrição. Residente está estável e sem queixas."
                {...register('reviewNotes')}
                className={errors.reviewNotes ? 'border-red-500' : ''}
                rows={4}
              />
              {errors.reviewNotes && (
                <p className="text-sm text-red-500">{errors.reviewNotes.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Caracteres (sem espaços): {cleanedLength}/10
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={recordReview.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={recordReview.isPending}
            >
              {recordReview.isPending ? (
                'Registrando...'
              ) : (
                <>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Registrar Revisão
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
