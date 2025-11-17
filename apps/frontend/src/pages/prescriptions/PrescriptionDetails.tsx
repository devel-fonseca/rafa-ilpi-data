import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft,
  Edit,
  FileText,
  User,
  Pill,
  AlertCircle,
  Calendar,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePrescription } from '@/hooks/usePrescriptions'
import { calculateAge } from '@/lib/utils'
import { AdministerMedicationModal } from './components/AdministerMedicationModal'
import { AdministerSOSModal } from './components/AdministerSOSModal'

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

export default function PrescriptionDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: prescription, isLoading } = usePrescription(id)

  const [administerModalOpen, setAdministerModalOpen] = useState(false)
  const [administerSOSModalOpen, setAdministerSOSModalOpen] = useState(false)
  const [selectedMedication, setSelectedMedication] = useState<any>(null)
  const [selectedSOSMedication, setSelectedSOSMedication] = useState<any>(null)

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

  const handleAdministerMedication = (medication: any) => {
    setSelectedMedication(medication)
    setAdministerModalOpen(true)
  }

  const handleAdministerSOS = (sosMedication: any) => {
    setSelectedSOSMedication(sosMedication)
    setAdministerSOSModalOpen(true)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Detalhes da Prescrição
            </h1>
            <Badge
              variant={prescriptionData.isActive ? 'default' : 'secondary'}
            >
              {prescriptionData.isActive ? 'Ativa' : 'Inativa'}
            </Badge>
            <Badge variant="outline">
              {PRESCRIPTION_TYPE_LABELS[prescriptionData.prescriptionType] ||
                prescriptionData.prescriptionType}
            </Badge>
          </div>
          <p className="text-gray-600">
            Prescrição de {prescriptionData.resident?.fullName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard/prescricoes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={() => navigate(`/dashboard/prescricoes/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Informações Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Residente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5" />
              Residente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Nome</p>
                <p className="font-semibold">
                  {prescriptionData.resident?.fullName}
                </p>
              </div>
              {prescriptionData.resident?.birthDate && (
                <div>
                  <p className="text-sm text-gray-600">Idade</p>
                  <p className="font-medium">
                    {calculateAge(prescriptionData.resident.birthDate)} anos
                  </p>
                </div>
              )}
              {prescriptionData.resident?.roomId && (
                <div>
                  <p className="text-sm text-gray-600">Localização</p>
                  <p className="font-medium">
                    Quarto {prescriptionData.resident.roomId}
                    {prescriptionData.resident.bedId &&
                      ` - Leito ${prescriptionData.resident.bedId}`}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prescritor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prescritor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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
                  {format(parseISO(prescriptionData.prescriptionDate), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Validade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {prescriptionData.validUntil ? (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Válida até</p>
                    <p className="font-semibold">
                      {format(parseISO(prescriptionData.validUntil), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    {new Date(prescriptionData.validUntil) > new Date() ? (
                      <Badge className="bg-green-100 text-green-700">
                        Dentro da validade
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Vencida</Badge>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">Sem data de validade</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dados de Controlado */}
      {prescriptionData.prescriptionType === 'CONTROLADO' && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-base text-purple-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Informações de Medicamento Controlado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Classe</p>
                <p className="font-medium text-purple-900">
                  {prescriptionData.controlledClass || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Notificação</p>
                <p className="font-medium text-purple-900">
                  {prescriptionData.notificationNumber || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo de Notificação</p>
                <p className="font-medium text-purple-900">
                  {prescriptionData.notificationType || '-'}
                </p>
              </div>
              {prescriptionData.prescriptionImageUrl && (
                <div>
                  <p className="text-sm text-gray-600">Receita</p>
                  <a
                    href={prescriptionData.prescriptionImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-700 hover:underline"
                  >
                    Ver arquivo
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs - Medicamentos e Histórico */}
      <Tabs defaultValue="medications" className="w-full">
        <TabsList>
          <TabsTrigger value="medications">
            Medicamentos Contínuos ({prescriptionData.medications?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="sos">
            Medicações SOS ({prescriptionData.sosMedications?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="medications" className="space-y-4 mt-6">
          {!prescriptionData.medications || prescriptionData.medications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-600">
                Nenhum medicamento contínuo cadastrado
              </CardContent>
            </Card>
          ) : (
            prescriptionData.medications.map((medication: any) => (
              <Card key={medication.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Pill className="h-5 w-5 text-blue-600" />
                        <div>
                          <h3 className="font-semibold text-lg">{medication.name}</h3>
                          <p className="text-sm text-gray-600">
                            {medication.presentation} - {medication.concentration}
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
                          {medication.requiresDoubleCheck && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700">
                              Dupla Checagem
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-600">Dose:</span>
                          <p className="font-medium">{medication.dose}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Via:</span>
                          <p className="font-medium">
                            {ROUTE_LABELS[medication.route] || medication.route}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Frequência:</span>
                          <p className="font-medium">{medication.frequency}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Horários:</span>
                          <p className="font-medium">
                            {medication.scheduledTimes?.join(', ')}
                          </p>
                        </div>
                      </div>

                      {medication.instructions && (
                        <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                          <span className="font-medium">Instruções:</span> {medication.instructions}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleAdministerMedication(medication)}
                      size="sm"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Administrar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sos" className="space-y-4 mt-6">
          {!prescriptionData.sosMedications || prescriptionData.sosMedications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-600">
                Nenhuma medicação SOS cadastrada
              </CardContent>
            </Card>
          ) : (
            prescriptionData.sosMedications.map((sos: any) => (
              <Card key={sos.id} className="border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <div>
                          <h3 className="font-semibold text-lg">{sos.name}</h3>
                          <p className="text-sm text-gray-600">
                            {sos.presentation} - {sos.concentration}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          SOS
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Indicação:</span>
                          <p className="font-medium">{sos.indication}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Dose:</span>
                          <p className="font-medium">{sos.dose}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Intervalo Mín.:</span>
                          <p className="font-medium">{sos.minInterval}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Máx. Diária:</span>
                          <p className="font-medium">{sos.maxDailyDoses}x</p>
                        </div>
                      </div>

                      {sos.indicationDetails && (
                        <div className="p-3 bg-orange-50 rounded border border-orange-200 text-sm">
                          <span className="font-medium">Detalhes:</span> {sos.indicationDetails}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleAdministerSOS(sos)}
                      size="sm"
                      variant="outline"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Administrar SOS
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Observações */}
      {prescriptionData.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{prescriptionData.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Modais */}
      {selectedMedication && (
        <AdministerMedicationModal
          open={administerModalOpen}
          onClose={() => {
            setAdministerModalOpen(false)
            setSelectedMedication(null)
          }}
          medication={selectedMedication}
        />
      )}

      {selectedSOSMedication && (
        <AdministerSOSModal
          open={administerSOSModalOpen}
          onClose={() => {
            setAdministerSOSModalOpen(false)
            setSelectedSOSMedication(null)
          }}
          sosMedication={selectedSOSMedication}
        />
      )}
    </div>
  )
}
