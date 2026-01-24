import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Save,
  FileText,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { usePrescription, useUpdatePrescription } from '@/hooks/usePrescriptions'
import type { Medication } from '@/api/medications.api'
import type { SOSMedication } from '@/api/sos-medications.api'
import { getSignedFileUrl } from '@/services/upload'
import { toast } from 'sonner'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import { Page, PageHeader, Section, EmptyState } from '@/design-system/components'

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

const PRESENTATION_LABELS: Record<string, string> = {
  COMPRIMIDO: 'Comprimido',
  CAPSULA: 'Cápsula',
  AMPOLA: 'Ampola',
  GOTAS: 'Gotas',
  SOLUCAO: 'Solução',
  SUSPENSAO: 'Suspensão',
  POMADA: 'Pomada',
  CREME: 'Creme',
  SPRAY: 'Spray',
  INALADOR: 'Inalador',
  ADESIVO: 'Adesivo',
  SUPOSITORIO: 'Supositório',
  OUTRO: 'Outro',
}

const FREQUENCY_LABELS: Record<string, string> = {
  UMA_VEZ_DIA: '1x ao dia',
  DUAS_VEZES_DIA: '2x ao dia',
  SEIS_SEIS_H: '6/6h',
  OITO_OITO_H: '8/8h',
  DOZE_DOZE_H: '12/12h',
  PERSONALIZADO: 'Personalizado',
}

export default function PrescriptionEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: prescription, isLoading } = usePrescription(id)
  const updateMutation = useUpdatePrescription()

  // Estado local apenas para isActive
  const [isActive, setIsActive] = useState<boolean>(true)

  // Sincronizar com dados carregados
  useEffect(() => {
    if (prescription?.isActive !== undefined) {
      setIsActive(prescription.isActive)
    }
  }, [prescription?.isActive])

  const handleSave = async () => {
    if (!id) return

    try {
      await updateMutation.mutateAsync({
        id,
        data: { isActive },
      })
      toast.success('Status da prescrição atualizado com sucesso!')
      // Pequeno delay para garantir que o cache seja invalidado
      setTimeout(() => {
        navigate(`/dashboard/prescricoes/${id}`)
      }, 100)
    } catch (error: unknown) {
      toast.error(error?.response?.data?.message || 'Erro ao atualizar prescrição')
    }
  }

  if (isLoading) {
    return (
      <Page>
        <PageHeader
          title="Editar Prescrição"
          subtitle="Carregando informações..."
          onBack={() => navigate('/dashboard/prescricoes')}
        />
        <EmptyState
          icon={FileText}
          title="Carregando prescrição..."
          description="Aguarde enquanto buscamos os detalhes"
          variant="loading"
        />
      </Page>
    )
  }

  if (!prescription) {
    return (
      <Page>
        <PageHeader
          title="Editar Prescrição"
          subtitle="Prescrição não encontrada"
          onBack={() => navigate('/dashboard/prescricoes')}
        />
        <EmptyState
          icon={AlertCircle}
          title="Prescrição não encontrada"
          description="A prescrição que você está procurando não existe ou foi removida."
          action={
            <Button onClick={() => navigate('/dashboard/prescricoes')}>
              Voltar ao Dashboard
            </Button>
          }
        />
      </Page>
    )
  }

  const prescriptionData = prescription.data

  return (
    <Page>
      <PageHeader
        title="Editar Prescrição"
        subtitle={
          <div className="flex items-center gap-3">
            <span>Altere o status da prescrição de {prescriptionData.resident?.fullName}</span>
            <Badge variant="outline">
              {PRESCRIPTION_TYPE_LABELS[prescriptionData.prescriptionType] ||
                prescriptionData.prescriptionType}
            </Badge>
          </div>
        }
        onBack={() => navigate(`/dashboard/prescricoes/${id}`)}
        actions={
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        }
      />

      {/* Card de Controle de Status (EDITÁVEL) */}
      <Section title="Status da Prescrição">
        <Card className="border-2 border-primary">
          <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="active-status" className="text-base font-semibold">
                Prescrição Ativa
              </Label>
              <p className="text-sm text-muted-foreground">
                {isActive
                  ? 'Esta prescrição está ativa e os medicamentos podem ser administrados'
                  : 'Esta prescrição está inativa e os medicamentos não podem ser administrados'}
              </p>
            </div>
            <Switch
              id="active-status"
              checked={isActive}
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-success/60"
            />
          </div>
          </CardContent>
        </Card>
      </Section>

      {/* Informações do Residente (SOMENTE LEITURA) */}
      <Section title="Dados do Residente">
        <Card>
          <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-semibold text-lg">
                {prescriptionData.resident?.fullName}
              </p>
            </div>
            {prescriptionData.resident?.chronicConditions && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Condições Crônicas</p>
                <p className="font-medium">
                  {prescriptionData.resident.chronicConditions}
                </p>
              </div>
            )}
          </div>
          </CardContent>
        </Card>
      </Section>

      {/* Informações da Prescrição (SOMENTE LEITURA) */}
      <Section title="Dados da Prescrição">
        <Card>
          <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Médico</p>
              <p className="font-semibold">{prescriptionData.doctorName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CRM</p>
              <p className="font-medium">
                {prescriptionData.doctorCrm} / {prescriptionData.doctorCrmState}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data da Prescrição</p>
              <p className="font-medium">
                {formatDateOnlySafe(prescriptionData.prescriptionDate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <p className="font-medium">
                {PRESCRIPTION_TYPE_LABELS[prescriptionData.prescriptionType]}
              </p>
            </div>
            {prescriptionData.validUntil && (
              <div>
                <p className="text-sm text-muted-foreground">Validade</p>
                <p className="font-medium">
                  {formatDateOnlySafe(prescriptionData.validUntil)}
                </p>
              </div>
            )}
            {prescriptionData.reviewDate && (
              <div>
                <p className="text-sm text-muted-foreground">Revisão</p>
                <p className="font-medium">
                  {formatDateOnlySafe(prescriptionData.reviewDate)}
                </p>
              </div>
            )}
            {prescriptionData.notes && (
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-sm text-muted-foreground">Observações</p>
                <p className="font-medium text-foreground/80">{prescriptionData.notes}</p>
              </div>
            )}
            {prescriptionData.processedFileUrl && (
              <div className="md:col-span-2 lg:col-span-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const fileUrl = prescriptionData.processedFileUrl!

                      // Se já é uma URL completa (http/https), abrir diretamente
                      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
                        window.open(fileUrl, '_blank')
                        return
                      }

                      // Caso contrário, obter URL assinada do MinIO
                      const signedUrl = await getSignedFileUrl(fileUrl)
                      window.open(signedUrl, '_blank')
                    } catch (error) {
                      console.error('Erro ao abrir prescrição:', error)
                      toast.error('Erro ao abrir arquivo da prescrição')
                    }
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Prescrição
                </Button>
              </div>
            )}
          </div>
          </CardContent>
        </Card>
      </Section>

      {/* Medicamentos Contínuos (SOMENTE LEITURA) */}
      {prescriptionData.medications && prescriptionData.medications.length > 0 && (
        <Section title={`Medicamentos Contínuos (${prescriptionData.medications.length})`}>
          <Card>
            <CardContent className="pt-6 space-y-4">
            {prescriptionData.medications.map((medication: Medication, index: number) => (
              <div
                key={medication.id}
                className="p-4 border rounded-lg bg-muted/50 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">
                      {index + 1}. {medication.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {PRESENTATION_LABELS[medication.presentation]} -{' '}
                      {medication.concentration}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {medication.isControlled && (
                      <Badge variant="outline" className="bg-medication-controlled/5 text-medication-controlled/80">
                        Controlado
                      </Badge>
                    )}
                    {medication.isHighRisk && (
                      <Badge variant="outline" className="bg-danger/5 text-danger/80">
                        Alto Risco
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Dose</p>
                    <p className="font-medium">{medication.dose}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Via</p>
                    <p className="font-medium">
                      {ROUTE_LABELS[medication.route]}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Frequência</p>
                    <p className="font-medium">
                      {FREQUENCY_LABELS[medication.frequency] || medication.frequency}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Horários</p>
                    <p className="font-medium">
                      {medication.scheduledTimes?.join(', ') || '-'}
                    </p>
                  </div>
                </div>

                {medication.instructions && (
                  <div className="p-3 bg-primary/5 rounded border border-primary/30 text-sm">
                    <span className="font-medium">Instruções:</span>{' '}
                    {medication.instructions}
                  </div>
                )}

                {medication.startDate && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Início:</span>{' '}
                    {formatDateOnlySafe(medication.startDate)}
                    {medication.endDate && (
                      <>
                        {' '}
                        | <span className="font-medium">Fim:</span>{' '}
                        {formatDateOnlySafe(medication.endDate)}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            </CardContent>
          </Card>
        </Section>
      )}

      {/* Medicamentos SOS (SOMENTE LEITURA) */}
      {prescriptionData.sosMedications && prescriptionData.sosMedications.length > 0 && (
        <Section title={`Medicamentos SOS (${prescriptionData.sosMedications.length})`}>
          <Card>
            <CardContent className="pt-6 space-y-4">
            {prescriptionData.sosMedications.map((sos: SOSMedication, index: number) => (
              <div
                key={sos.id}
                className="p-4 border border-severity-warning/30 rounded-lg bg-severity-warning/5 space-y-3"
              >
                <div>
                  <h4 className="font-semibold text-lg">
                    {index + 1}. {sos.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {PRESENTATION_LABELS[sos.presentation]} - {sos.concentration}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Indicação</p>
                    <p className="font-medium">{sos.indication}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dose</p>
                    <p className="font-medium">{sos.dose}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Intervalo Mínimo</p>
                    <p className="font-medium">{sos.minInterval}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Máximo Diário</p>
                    <p className="font-medium">{sos.maxDailyDoses}x</p>
                  </div>
                </div>

                {sos.indicationDetails && (
                  <div className="p-3 bg-severity-warning/10 rounded border border-severity-warning/30 text-sm">
                    <span className="font-medium">Detalhes:</span> {sos.indicationDetails}
                  </div>
                )}

                {sos.instructions && (
                  <div className="p-3 bg-severity-warning/10 rounded border border-severity-warning/30 text-sm">
                    <span className="font-medium">Instruções:</span> {sos.instructions}
                  </div>
                )}
              </div>
            ))}
            </CardContent>
          </Card>
        </Section>
      )}
    </Page>
  )
}
