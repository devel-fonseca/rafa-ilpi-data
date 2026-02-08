// ──────────────────────────────────────────────────────────────────────────────
//  VIEW - PrescriptionsView (Prescrições)
// ──────────────────────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pill, FileText, Lock, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { usePrescriptions } from '@/hooks/usePrescriptions'
import { useFeatures } from '@/hooks/useFeatures'
import { extractDateOnly } from '@/utils/dateHelpers'
import type { MedicalViewProps } from '../types'
import type { Prescription, Medication } from '@/api/prescriptions.api'

// ========== COMPONENT ==========

export function PrescriptionsView({ residentId, residentName }: MedicalViewProps) {
  const navigate = useNavigate()
  const { hasFeature } = useFeatures()

  // Buscar prescrições do residente
  const { prescriptions = [] } = usePrescriptions({
    residentId,
    page: 1,
    limit: 100,
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Prescrições Médicas</CardTitle>
            <CardDescription>
              Prescrições registradas para {residentName}
            </CardDescription>
          </div>
          {hasFeature('medicacoes') && (
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/medicacoes-ativas/${residentId}`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Ver Ficha de Medicações
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasFeature('medicacoes') ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Lock className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <h3 className="text-lg font-semibold">Recurso Bloqueado</h3>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Prescrições e medicamentos</strong> não está disponível no seu plano atual.
              </p>
              <p className="text-sm text-muted-foreground">
                Gerencie prescrições médicas, controle de medicamentos contínuos e SOS, histórico de administrações, calendário de medicações e alertas de vencimento.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border border-border max-w-md">
              <p className="text-xs text-muted-foreground text-center">
                Faça upgrade do seu plano para desbloquear este e outros recursos avançados
              </p>
            </div>
            <Button onClick={() => navigate('/settings/billing')}>
              <Zap className="mr-2 h-4 w-4" />
              Fazer Upgrade
            </Button>
          </div>
        ) : prescriptions.length > 0 ? (
          <div className="space-y-4">
            {prescriptions.map((prescription: Prescription) => (
              <div
                key={prescription.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/dashboard/prescricoes/${prescription.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="h-4 w-4 text-info" />
                      <h4 className="font-semibold">
                        Prescrição de{' '}
                        {format(new Date(extractDateOnly(prescription.prescriptionDate) + 'T12:00:00'), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                      </h4>
                      <Badge
                        variant={prescription.isActive ? 'default' : 'secondary'}
                      >
                        {prescription.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                      {prescription.medications?.some((med: Medication) => med.isControlled) && (
                        <Badge variant="destructive">Controlado</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Médico:</span>{' '}
                        {prescription.doctorName}
                      </div>
                      <div>
                        <span className="font-medium">Tipo:</span>{' '}
                        {prescription.prescriptionType}
                      </div>
                      {prescription.validUntil && (
                        <div>
                          <span className="font-medium">Validade:</span>{' '}
                          {format(new Date(extractDateOnly(prescription.validUntil) + 'T12:00:00'), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Medicamentos:</span>{' '}
                        {prescription.medications?.length || 0}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Pill className="h-12 w-12 text-muted-foreground" />
            <div className="text-muted-foreground">Nenhuma prescrição cadastrada</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/prescricoes/new')}
            >
              Criar primeira prescrição
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
