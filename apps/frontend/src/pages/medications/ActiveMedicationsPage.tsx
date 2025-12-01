import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer, Loader2, AlertCircle, Pill } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/services/api'
import type { Prescription, Medication } from '@/api/prescriptions.api'
import { formatDateShort } from '@/utils/timezone'
import { useReactToPrint } from 'react-to-print'
import { InstitutionalHeader } from '@/components/print/InstitutionalHeader'
import { SignatureFooter } from '@/components/print/SignatureFooter'

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
    queryKey: ['resident', residentId],
    queryFn: async () => {
      const response = await api.get(`/residents/${residentId}`)
      return response.data
    },
    enabled: !!residentId,
  })

  // Buscar prescrições ativas do residente com todos os campos dos medicamentos
  const { data: prescriptionsResponse, isLoading: isLoadingPrescriptions } = useQuery({
    queryKey: ['prescriptions', { residentId, isActive: 'true' }],
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
    documentTitle: `Ficha_Medicacoes_${residentData?.fullName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`,
  })

  if (isLoadingResident || isLoadingPrescriptions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Carregando medicações...</span>
        </div>
      </div>
    )
  }

  if (!residentData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Residente não encontrado</p>
        <Button onClick={() => navigate('/dashboard/residentes')}>
          Voltar para Residentes
        </Button>
      </div>
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
    const validUntilDate = new Date(prescription.validUntil)
    validUntilDate.setHours(0, 0, 0, 0)

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Ficha de Medicações Ativas
          </h1>
          <p className="text-muted-foreground mt-1">{residentData.fullName}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/residentes/${residentId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          {hasMedications && (
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Ficha
            </Button>
          )}
        </div>
      </div>

      {/* Área de Impressão */}
      <div ref={printRef}>
        {/* Visualização na Tela */}
        {!hasMedications ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-3">
              <Pill className="h-12 w-12 text-muted-foreground/40" />
              <div className="text-muted-foreground">
                Nenhuma medicação ativa encontrada
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/prescricoes/new')}
              >
                Criar prescrição
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cabeçalho Institucional */}
            <InstitutionalHeader
              documentTitle="FICHA DE PRESCRIÇÃO"
              documentSubtitle={
                <p className="text-sm">
                  <strong>Residente:</strong> {residentData.fullName}
                </p>
              }
            />

            {/* Tabela Compacta para Impressão */}
            <div className="print-only">
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
                          {item.medication.name}{' '}
                          {item.medication.concentration}
                        </td>
                        <td>{item.medication.dose}</td>
                        <td>
                          {ROUTE_LABELS[item.medication.route] ||
                            item.medication.route}
                        </td>
                        <td>{item.time}</td>
                        <td>{item.medication.instructions || ''}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Tabela de Medicações - Agrupadas por Horário (apenas tela) */}
            {sortedTimes.map((time) => (
              <Card key={time} className="mb-4 print-hide print-break-inside-avoid">
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
                          <th className="text-left p-2 font-semibold print-hide">Prescrição</th>
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
                            <td className="p-2 print-hide">
                              <div className="text-xs">
                                <div>{formatDateShort(item.prescriptionDate)}</div>
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

            {/* Rodapé para impressão */}
            <SignatureFooter
              signatureTitle="RESPONSÁVEL TÉCNICO"
              includeDate={true}
            />
          </>
        )}
      </div>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print-hide {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .print-break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
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

          /* Linhas de assinatura na impressão */
          .border-b {
            border-bottom: 1px solid #9ca3af !important;
          }

          @page {
            margin: 2cm;
            size: A4;
          }
        }

        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
