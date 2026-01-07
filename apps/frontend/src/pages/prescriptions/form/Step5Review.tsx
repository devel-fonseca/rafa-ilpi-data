import { useFormContext } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { extractDateOnly } from '@/utils/dateHelpers'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, AlertCircle, User, FileText, Pill, Upload, ImageIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/services/api'
import { calculateAge } from '@/lib/utils'
import { SingleFileUpload } from '@/components/form/SingleFileUpload'
import type { CreatePrescriptionDto } from '@/api/prescriptions.api'

interface Resident {
  id: string
  fullName: string
  birthDate: string
}

const PRESCRIPTION_TYPE_LABELS: Record<string, string> = {
  ROTINA: 'Rotina',
  ALTERACAO_PONTUAL: 'Alteração Pontual',
  ANTIBIOTICO: 'Antibiótico',
  ALTO_RISCO: 'Alto Risco',
  CONTROLADO: 'Medicamento Controlado',
  OUTRO: 'Outro',
}

const ROUTE_LABELS: Record<string, string> = {
  VO: 'Via Oral',
  IM: 'Intramuscular',
  EV: 'Endovenosa',
  SC: 'Subcutânea',
  TOPICA: 'Tópica',
  SL: 'Sublingual',
  RETAL: 'Retal',
  OCULAR: 'Ocular',
  NASAL: 'Nasal',
  INALATORIA: 'Inalatória',
  OUTRA: 'Outra',
}

export function Step5Review() {
  const { watch, setValue } = useFormContext<CreatePrescriptionDto>()
  const formData = watch()

  const { data: resident } = useQuery({
    queryKey: ['resident', formData.residentId],
    queryFn: async () => {
      const response = await api.get<Resident>(`/residents/${formData.residentId}`)
      return response.data
    },
    enabled: !!formData.residentId,
  })

  const hasErrors = []
  if (!formData.residentId) hasErrors.push('Residente não selecionado')
  if (!formData.doctorName) hasErrors.push('Nome do médico não informado')
  if (!formData.doctorCrm) hasErrors.push('CRM não informado')
  if (!formData.medications || formData.medications.length === 0)
    hasErrors.push('Nenhum medicamento contínuo adicionado')

  // Validar imagem obrigatória para medicamentos controlados
  if (formData.prescriptionType === 'CONTROLADO' && !formData.prescriptionImage) {
    hasErrors.push('Imagem da prescrição é obrigatória para medicamentos controlados')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Revisão Final</h2>
        <p className="text-sm text-muted-foreground">
          Confira todos os dados antes de salvar a prescrição
        </p>
      </div>

      {hasErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-1">Pendências encontradas:</p>
            <ul className="list-disc list-inside text-sm">
              {hasErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {hasErrors.length === 0 && (
        <Alert className="border-success/30 bg-success/5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success/90">
            Todos os dados obrigatórios foram preenchidos. Clique em "Salvar
            Prescrição" para finalizar.
          </AlertDescription>
        </Alert>
      )}

      {/* Residente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados do Residente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resident ? (
            <div className="space-y-2">
              <p className="text-lg font-semibold">{resident.fullName}</p>
              <p className="text-sm text-muted-foreground">
                {format(
                  new Date(extractDateOnly(resident.birthDate) + 'T12:00:00'),
                  "dd 'de' MMMM 'de' yyyy",
                  { locale: ptBR }
                )}{' '}
                ({calculateAge(resident.birthDate)} anos)
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Carregando...</p>
          )}
        </CardContent>
      </Card>

      {/* Prescritor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informações do Prescritor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Médico</p>
              <p className="font-medium">{formData.doctorName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CRM</p>
              <p className="font-medium">
                {formData.doctorCrm || '-'} / {formData.doctorCrmState || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data da Prescrição</p>
              <p className="font-medium">
                {formData.prescriptionDate
                  ? format(
                      new Date(extractDateOnly(formData.prescriptionDate) + 'T12:00:00'),
                      "dd/MM/yyyy"
                    )
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <Badge>
                {PRESCRIPTION_TYPE_LABELS[formData.prescriptionType] ||
                  formData.prescriptionType}
              </Badge>
            </div>
          </div>

          {formData.validUntil && (
            <div>
              <p className="text-sm text-muted-foreground">Validade</p>
              <p className="font-medium">
                {format(
                  new Date(extractDateOnly(formData.validUntil) + 'T12:00:00'),
                  "dd/MM/yyyy"
                )}
              </p>
            </div>
          )}

          {formData.prescriptionType === 'CONTROLADO' && (
            <div className="mt-4 p-3 bg-medication-controlled/5 border border-medication-controlled/30 rounded">
              <p className="text-sm font-semibold text-medication-controlled/95 mb-2">
                Dados de Medicamento Controlado
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Classe:</span>{' '}
                  <span className="font-medium">{formData.controlledClass || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Notificação:</span>{' '}
                  <span className="font-medium">
                    {formData.notificationNumber || '-'} (
                    {formData.notificationType || '-'})
                  </span>
                </div>
              </div>
            </div>
          )}

          {formData.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Observações</p>
              <p className="text-sm text-foreground/90">{formData.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload da Prescrição Médica */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Imagem da Prescrição Médica
            {formData.prescriptionType === 'CONTROLADO' && (
              <Badge variant="destructive" className="ml-auto">
                Obrigatório
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SingleFileUpload
            label="Arquivo da Prescrição"
            description={
              formData.prescriptionType === 'CONTROLADO'
                ? 'Para medicamentos controlados, é obrigatório anexar a imagem da prescrição médica.'
                : 'Anexe a imagem da prescrição médica (opcional). Formatos: JPG, PNG ou PDF (máx. 10MB)'
            }
            accept="image/*,application/pdf"
            required={formData.prescriptionType === 'CONTROLADO'}
            onFileSelect={(file) => setValue('prescriptionImage', file)}
            showPreview={true}
          />
        </CardContent>
      </Card>

      {/* Medicamentos Contínuos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medicamentos Contínuos
            <Badge variant="outline" className="ml-auto">
              {formData.medications?.length || 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!formData.medications || formData.medications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum medicamento contínuo adicionado
            </p>
          ) : (
            <div className="space-y-3">
              {formData.medications.map((med, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-border rounded-lg bg-muted/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{med.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {med.presentation} - {med.concentration}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {med.isControlled && (
                        <Badge
                          variant="outline"
                          className="bg-medication-controlled/5 text-medication-controlled/80 text-xs"
                        >
                          Controlado
                        </Badge>
                      )}
                      {med.isHighRisk && (
                        <Badge
                          variant="outline"
                          className="bg-danger/5 text-danger/80 text-xs"
                        >
                          Alto Risco
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Dose:</span>{' '}
                      <span className="font-medium">{med.dose}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Via:</span>{' '}
                      <span className="font-medium">
                        {ROUTE_LABELS[med.route] || med.route}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Horários:</span>{' '}
                      <span className="font-medium">
                        {med.scheduledTimes.join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medicações SOS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-severity-warning" />
            Medicações SOS
            <Badge variant="outline" className="ml-auto">
              {formData.sosMedications?.length || 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!formData.sosMedications || formData.sosMedications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma medicação SOS adicionada
            </p>
          ) : (
            <div className="space-y-3">
              {formData.sosMedications.map((sos, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-severity-warning/30 rounded-lg bg-severity-warning/5"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{sos.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {sos.presentation} - {sos.concentration}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-severity-warning/10 text-severity-warning/80">
                      SOS
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Indicação:</span>{' '}
                      <span className="font-medium">{sos.indication}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dose:</span>{' '}
                      <span className="font-medium">{sos.dose}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Intervalo Mín.:</span>{' '}
                      <span className="font-medium">{sos.minInterval}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Máx. Diária:</span>{' '}
                      <span className="font-medium">{sos.maxDailyDoses}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
