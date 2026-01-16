import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer, Loader2, AlertCircle, Pill } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import type { Prescription, Medication } from '@/api/prescriptions.api'
import { formatDateOnlySafe, extractDateOnly } from '@/utils/dateHelpers'
import { useReactToPrint } from 'react-to-print'
import { InstitutionalHeader } from '@/components/print/InstitutionalHeader'
import { SignatureFooter } from '@/components/print/SignatureFooter'
import { getCurrentDate } from '@/utils/dateHelpers'
import { Page, PageHeader, Section, EmptyState } from '@/design-system/components'

// Mapeamento de vias de administração
const ROUTE_LABELS: Record<string, string> = {
  VO: 'Oral',
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

interface MedicationWithTime {
  medication: Medication
  time: string
  prescriptionDate: string
  doctorName: string
}

interface GroupedMedications {
  [time: string]: MedicationWithTime[]
}

export default function ActiveMedicationsPage() {
  const { residentId } = useParams<{ residentId: string }>()
  const navigate = useNavigate()
  const printRef = useRef<HTMLDivElement>(null)

  // Buscar dados do residente
  const { data: residentData, isLoading: isLoadingResident } = useQuery({
    queryKey: tenantKey('residents', residentId),
    queryFn: async () => {
      const response = await api.get(`/residents/${residentId}`)
      return response.data
    },
    enabled: !!residentId,
  })

  // Buscar prescrições ativas do residente com todos os campos dos medicamentos
  const { data: prescriptionsResponse, isLoading: isLoadingPrescriptions } = useQuery({
    queryKey: tenantKey('prescriptions', 'list', JSON.stringify({ residentId, isActive: 'true' })),
    queryFn: async () => {
      const response = await api.get('/prescriptions', {
        params: { residentId, isActive: 'true', limit: '100' },
      })
      return response.data
    },
    enabled: !!residentId,
  })

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Ficha_Medicacoes_${residentData?.fullName.replace(/\s/g, '_')}_${getCurrentDate()}`,
  })

  if (isLoadingResident || isLoadingPrescriptions) {
    return (
      <Page>
        <PageHeader
          title="Ficha de Medicações Ativas"
          subtitle="Carregando informações..."
          onBack={() => navigate('/dashboard/residentes')}
        />
        <EmptyState
          icon={Loader2}
          title="Carregando medicações..."
          description="Aguarde enquanto buscamos os dados"
          variant="loading"
        />
      </Page>
    )
  }

  if (!residentData) {
    return (
      <Page>
        <PageHeader
          title="Ficha de Medicações Ativas"
          subtitle="Residente não encontrado"
          onBack={() => navigate('/dashboard/residentes')}
        />
        <EmptyState
          icon={AlertCircle}
          title="Residente não encontrado"
          description="O residente que você está procurando não existe ou foi removido."
          action={
            <Button onClick={() => navigate('/dashboard/residentes')}>
              Voltar para Residentes
            </Button>
          }
        />
      </Page>
    )
  }

  // A resposta vem como { data: [...], meta: {...} }, não { data: { data: [...] } }
  const prescriptions: Prescription[] = prescriptionsResponse?.data || []

  // Filtrar apenas prescrições não vencidas (validUntil >= hoje ou sem validUntil)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Zerar horas para comparação apenas de data

  const validPrescriptions = prescriptions.filter((prescription) => {
    // Se não tem validUntil, considera válida
    if (!prescription.validUntil) return true

    // Se tem validUntil, verifica se ainda não venceu
    // ✅ Usa extractDateOnly para evitar timezone shift em campo DATE
    const dayKey = extractDateOnly(prescription.validUntil)
    const validUntilDate = new Date(dayKey + 'T12:00:00')

    return validUntilDate >= today
  })

  // Consolidar todas as medicações ativas de todas as prescrições válidas
  const allMedications: MedicationWithTime[] = []

  validPrescriptions.forEach((prescription) => {
    prescription.medications?.forEach((medication) => {
      medication.scheduledTimes?.forEach((time) => {
        allMedications.push({
          medication,
          time,
          prescriptionDate: prescription.prescriptionDate,
          doctorName: prescription.doctorName,
        })
      })
    })
  })

  // Agrupar medicações por horário
  const groupedByTime: GroupedMedications = allMedications.reduce((acc, item) => {
    if (!acc[item.time]) {
      acc[item.time] = []
    }
    acc[item.time].push(item)
    return acc
  }, {} as GroupedMedications)

  // Ordenar horários
  const sortedTimes = Object.keys(groupedByTime).sort()

  const hasMedications = allMedications.length > 0

  return (
    <Page>
      <PageHeader
        title="Ficha de Medicações Ativas"
        subtitle={residentData.fullName}
        onBack={() => navigate(`/dashboard/residentes/${residentId}`)}
        actions={
          hasMedications && (
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Ficha
            </Button>
          )
        }
      />

      {/* Visualização na Tela */}
      {!hasMedications ? (
        <EmptyState
          icon={Pill}
          title="Nenhuma medicação ativa encontrada"
          description="Não há medicações ativas para este residente no momento"
          action={
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/prescricoes/new')}
            >
              Criar prescrição
            </Button>
          }
        />
      ) : (
        <Section title="Medicações por Horário">
          {sortedTimes.map((time) => (
            <Card key={time} className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="inline-flex items-center bg-primary/10 text-primary px-3 py-1 rounded-md font-mono font-semibold">
                      {time}
                    </span>
                    <span className="text-muted-foreground text-sm font-normal">
                      ({groupedByTime[time].length}{' '}
                      {groupedByTime[time].length === 1
                        ? 'medicamento'
                        : 'medicamentos'}
                      )
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-semibold">Medicamento</th>
                          <th className="text-left p-2 font-semibold">Dose</th>
                          <th className="text-left p-2 font-semibold">Via</th>
                          <th className="text-left p-2 font-semibold">Prescrição</th>
                          <th className="text-left p-2 font-semibold">Observações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedByTime[time].map((item, index) => (
                          <tr key={index} className="border-b last:border-0">
                            <td className="p-2">
                              <div>
                                <div className="font-medium">{item.medication.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {item.medication.concentration}
                                </div>
                              </div>
                            </td>
                            <td className="p-2">{item.medication.dose}</td>
                            <td className="p-2">
                              {ROUTE_LABELS[item.medication.route] ||
                                item.medication.route}
                            </td>
                            <td className="p-2">
                              <div className="text-xs">
                                <div>{formatDateOnlySafe(item.prescriptionDate)}</div>
                                <div className="text-muted-foreground">
                                  Dr(a). {item.doctorName}
                                </div>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="space-y-1">
                                {item.medication.instructions && (
                                  <div className="text-xs">
                                    {item.medication.instructions}
                                  </div>
                                )}
                                <div className="flex gap-1 flex-wrap">
                                  {item.medication.isControlled && (
                                    <Badge variant="destructive" className="text-xs">
                                      Controlado
                                    </Badge>
                                  )}
                                  {item.medication.isHighRisk && (
                                    <Badge variant="warning" className="text-xs">
                                      Alto Risco
                                    </Badge>
                                  )}
                                  {item.medication.requiresDoubleCheck && (
                                    <Badge variant="secondary" className="text-xs">
                                      Dupla Checagem
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
        </Section>
      )}

      {/* Área de Impressão (oculta na tela, visível apenas ao imprimir) */}
      {hasMedications && (
        <div ref={printRef} className="hidden print:block">
          <InstitutionalHeader
            documentTitle="FICHA DE PRESCRIÇÃO"
            documentSubtitle={
              <p className="text-sm">
                <strong>Residente:</strong> {residentData.fullName}
              </p>
            }
          />

          {/* Tabela Compacta para Impressão */}
          <table className="print-table">
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Dose</th>
                <th>Via</th>
                <th>Horário</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              {allMedications
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((item, index) => (
                  <tr key={index}>
                    <td>
                      {item.medication.name} {item.medication.concentration}
                    </td>
                    <td>{item.medication.dose}</td>
                    <td>
                      {ROUTE_LABELS[item.medication.route] || item.medication.route}
                    </td>
                    <td>{item.time}</td>
                    <td>{item.medication.instructions || ''}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          <SignatureFooter
            signatureTitle="RESPONSÁVEL TÉCNICO"
            includeDate={true}
          />
        </div>
      )}

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* Estilos da tabela impressa */
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 20px;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
          }

          .print-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
          }

          .print-table tbody tr:nth-child(even) {
            background-color: #fafafa;
          }

          @page {
            margin: 2cm;
            size: A4;
          }
        }
      `}</style>
    </Page>
  )
}
