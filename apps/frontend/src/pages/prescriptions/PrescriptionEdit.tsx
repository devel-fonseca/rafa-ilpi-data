import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  FileText,
  User,
  Pill,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { usePrescription, useUpdatePrescription } from '@/hooks/usePrescriptions'
import { getSignedFileUrl } from '@/services/upload'
import { toast } from 'sonner'
import { formatDateOnlySafe } from '@/utils/dateHelpers'

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
    if (prescription?.data?.isActive !== undefined) {
      setIsActive(prescription.data.isActive)
    }
  }, [prescription?.data?.isActive])

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
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao atualizar prescrição')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
          <span className="text-gray-600">Carregando prescrição...</span>
        </div>
      </div>
    )
  }

  if (!prescription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-gray-400" />
        <p className="text-gray-600">Prescrição não encontrada</p>
        <Button onClick={() => navigate('/dashboard/prescricoes')}>
          Voltar ao Dashboard
        </Button>
      </div>
    )
  }

  const prescriptionData = prescription.data

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Editar Prescrição
            </h1>
            <Badge variant="outline">
              {PRESCRIPTION_TYPE_LABELS[prescriptionData.prescriptionType] ||
                prescriptionData.prescriptionType}
            </Badge>
          </div>
          <p className="text-gray-600">
            Altere o status da prescrição de {prescriptionData.resident?.fullName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/prescricoes/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      {/* Card de Controle de Status (EDITÁVEL) */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Status da Prescrição
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              className="data-[state=checked]:bg-green-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Informações do Residente (SOMENTE LEITURA) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados do Residente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Nome</p>
              <p className="font-semibold text-lg">
                {prescriptionData.resident?.fullName}
              </p>
            </div>
            {prescriptionData.resident?.chronicConditions && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Condições Crônicas</p>
                <p className="font-medium">
                  {prescriptionData.resident.chronicConditions}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações da Prescrição (SOMENTE LEITURA) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dados da Prescrição
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Médico</p>
              <p className="font-semibold">{prescriptionData.doctorName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">CRM</p>
              <p className="font-medium">
                {prescriptionData.doctorCrm} / {prescriptionData.doctorCrmState}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Data da Prescrição</p>
              <p className="font-medium">
                {formatDateOnlySafe(prescriptionData.prescriptionDate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tipo</p>
              <p className="font-medium">
                {PRESCRIPTION_TYPE_LABELS[prescriptionData.prescriptionType]}
              </p>
            </div>
            {prescriptionData.validUntil && (
              <div>
                <p className="text-sm text-gray-600">Validade</p>
                <p className="font-medium">
                  {formatDateOnlySafe(prescriptionData.validUntil)}
                </p>
              </div>
            )}
            {prescriptionData.reviewDate && (
              <div>
                <p className="text-sm text-gray-600">Revisão</p>
                <p className="font-medium">
                  {formatDateOnlySafe(prescriptionData.reviewDate)}
                </p>
              </div>
            )}
            {prescriptionData.notes && (
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-sm text-gray-600">Observações</p>
                <p className="font-medium text-gray-700">{prescriptionData.notes}</p>
              </div>
            )}
            {prescriptionData.prescriptionImageUrl && (
              <div className="md:col-span-2 lg:col-span-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const fileUrl = prescriptionData.prescriptionImageUrl!

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
                  Ver Prescrição (Imagem)
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Medicamentos Contínuos (SOMENTE LEITURA) */}
      {prescriptionData.medications && prescriptionData.medications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Medicamentos Contínuos ({prescriptionData.medications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prescriptionData.medications.map((medication: any, index: number) => (
              <div
                key={medication.id}
                className="p-4 border rounded-lg bg-gray-50 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">
                      {index + 1}. {medication.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {PRESENTATION_LABELS[medication.presentation]} -{' '}
                      {medication.concentration}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {medication.isControlled && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        Controlado
                      </Badge>
                    )}
                    {medication.isHighRisk && (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        Alto Risco
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Dose</p>
                    <p className="font-medium">{medication.dose}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Via</p>
                    <p className="font-medium">
                      {ROUTE_LABELS[medication.route]}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Frequência</p>
                    <p className="font-medium">
                      {FREQUENCY_LABELS[medication.frequency] || medication.frequency}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Horários</p>
                    <p className="font-medium">
                      {medication.scheduledTimes?.join(', ') || '-'}
                    </p>
                  </div>
                </div>

                {medication.instructions && (
                  <div className="p-3 bg-blue-50 rounded border border-blue-200 text-sm">
                    <span className="font-medium">Instruções:</span>{' '}
                    {medication.instructions}
                  </div>
                )}

                {medication.startDate && (
                  <div className="text-xs text-gray-500">
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
      )}

      {/* Medicamentos SOS (SOMENTE LEITURA) */}
      {prescriptionData.sosMedications && prescriptionData.sosMedications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Medicamentos SOS ({prescriptionData.sosMedications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prescriptionData.sosMedications.map((sos: any, index: number) => (
              <div
                key={sos.id}
                className="p-4 border border-orange-200 rounded-lg bg-orange-50 space-y-3"
              >
                <div>
                  <h4 className="font-semibold text-lg">
                    {index + 1}. {sos.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {PRESENTATION_LABELS[sos.presentation]} - {sos.concentration}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Indicação</p>
                    <p className="font-medium">{sos.indication}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Dose</p>
                    <p className="font-medium">{sos.dose}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Intervalo Mínimo</p>
                    <p className="font-medium">{sos.minInterval}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Máximo Diário</p>
                    <p className="font-medium">{sos.maxDailyDoses}x</p>
                  </div>
                </div>

                {sos.indicationDetails && (
                  <div className="p-3 bg-orange-100 rounded border border-orange-300 text-sm">
                    <span className="font-medium">Detalhes:</span> {sos.indicationDetails}
                  </div>
                )}

                {sos.instructions && (
                  <div className="p-3 bg-orange-100 rounded border border-orange-300 text-sm">
                    <span className="font-medium">Instruções:</span> {sos.instructions}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
