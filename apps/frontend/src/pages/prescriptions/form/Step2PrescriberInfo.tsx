import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const PRESCRIPTION_TYPES = [
  { value: 'ROTINA', label: 'Rotina' },
  { value: 'ALTERACAO_PONTUAL', label: 'Alteração Pontual' },
  { value: 'ANTIBIOTICO', label: 'Antibiótico' },
  { value: 'ALTO_RISCO', label: 'Alto Risco' },
  { value: 'CONTROLADO', label: 'Medicamento Controlado' },
  { value: 'OUTRO', label: 'Outro' },
]

const CONTROLLED_CLASSES = [
  { value: 'BZD', label: 'Benzodiazepínicos' },
  { value: 'PSICOFARMACO', label: 'Psicofármaco' },
  { value: 'OPIOIDE', label: 'Opioide' },
  { value: 'ANTICONVULSIVANTE', label: 'Anticonvulsivante' },
  { value: 'OUTRO', label: 'Outro' },
]

const NOTIFICATION_TYPES = [
  { value: 'AMARELA', label: 'Amarela (A)' },
  { value: 'AZUL', label: 'Azul (B)' },
  { value: 'BRANCA_ESPECIAL', label: 'Branca Especial' },
]

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

export function Step2PrescriberInfo() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext()

  const prescriptionType = watch('prescriptionType')
  const isControlled = prescriptionType === 'CONTROLADO'
  const requiresValidity = isControlled || prescriptionType === 'ANTIBIOTICO'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Informações do Prescritor</h2>
        <p className="text-sm text-muted-foreground">
          Dados do médico responsável pela prescrição
        </p>
      </div>

      {/* Dados do Médico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Médico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="doctorName">Nome do Médico *</Label>
            <Input
              id="doctorName"
              {...register('doctorName', {
                required: 'Nome do médico é obrigatório',
              })}
              placeholder="Dr. João Silva"
            />
            {errors.doctorName && (
              <p className="text-sm text-danger mt-1">
                {errors.doctorName.message as string}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doctorCrm">CRM *</Label>
              <Input
                id="doctorCrm"
                {...register('doctorCrm', {
                  required: 'CRM é obrigatório',
                })}
                placeholder="123456"
              />
              {errors.doctorCrm && (
                <p className="text-sm text-danger mt-1">
                  {errors.doctorCrm.message as string}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="doctorCrmState">UF do CRM *</Label>
              <Select
                value={watch('doctorCrmState')}
                onValueChange={(value) => setValue('doctorCrmState', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {BR_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.doctorCrmState && (
                <p className="text-sm text-danger mt-1">
                  {errors.doctorCrmState.message as string}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados da Prescrição */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da Prescrição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prescriptionDate">Data da Prescrição *</Label>
              <Input
                id="prescriptionDate"
                type="date"
                {...register('prescriptionDate', {
                  required: 'Data da prescrição é obrigatória',
                })}
              />
              {errors.prescriptionDate && (
                <p className="text-sm text-danger mt-1">
                  {errors.prescriptionDate.message as string}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="prescriptionType">Tipo de Prescrição *</Label>
              <Select
                value={watch('prescriptionType')}
                onValueChange={(value) => setValue('prescriptionType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESCRIPTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requiresValidity && (
              <div>
                <Label htmlFor="validUntil">
                  Validade da Prescrição *
                  {isControlled && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Obrigatório para medicamentos controlados)
                    </span>
                  )}
                </Label>
                <Input
                  id="validUntil"
                  type="date"
                  {...register('validUntil', {
                    required: requiresValidity
                      ? 'Validade é obrigatória para este tipo de prescrição'
                      : false,
                  })}
                />
                {errors.validUntil && (
                  <p className="text-sm text-danger mt-1">
                    {errors.validUntil.message as string}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="reviewDate">
                Data Estimada de Revisão
                <span className="text-xs text-muted-foreground ml-2">
                  (Recomendado para prescrições de rotina)
                </span>
              </Label>
              <Input
                id="reviewDate"
                type="date"
                {...register('reviewDate')}
              />
              {errors.reviewDate && (
                <p className="text-sm text-danger mt-1">
                  {errors.reviewDate.message as string}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Observações adicionais sobre a prescrição..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Campos Condicionais para Medicamentos Controlados */}
      {isControlled && (
        <Card className="border-medication-controlled/30 bg-medication-controlled/5">
          <CardHeader>
            <CardTitle className="text-base text-medication-controlled/90 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Dados de Medicamento Controlado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Medicamentos controlados requerem informações adicionais
                obrigatórias conforme legislação vigente.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="controlledClass">Classe do Medicamento *</Label>
              <Select
                value={watch('controlledClass')}
                onValueChange={(value) => setValue('controlledClass', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a classe" />
                </SelectTrigger>
                <SelectContent>
                  {CONTROLLED_CLASSES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.controlledClass && (
                <p className="text-sm text-danger mt-1">
                  {errors.controlledClass.message as string}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="notificationNumber">
                  Número da Notificação *
                </Label>
                <Input
                  id="notificationNumber"
                  {...register('notificationNumber', {
                    required: isControlled
                      ? 'Número da notificação é obrigatório'
                      : false,
                  })}
                  placeholder="123456789"
                />
                {errors.notificationNumber && (
                  <p className="text-sm text-danger mt-1">
                    {errors.notificationNumber.message as string}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="notificationType">Tipo de Notificação *</Label>
                <Select
                  value={watch('notificationType')}
                  onValueChange={(value) =>
                    setValue('notificationType', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.notificationType && (
                  <p className="text-sm text-danger mt-1">
                    {errors.notificationType.message as string}
                  </p>
                )}
              </div>
            </div>

            <Alert className="bg-primary/5 border-primary/30">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-primary/90">
                <strong>Importante:</strong> O upload da imagem da prescrição médica
                será realizado no passo final (Revisão). Este campo é obrigatório
                para medicamentos controlados.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
