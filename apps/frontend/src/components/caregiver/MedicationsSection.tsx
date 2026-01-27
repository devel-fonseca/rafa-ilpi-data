import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Pill,
  CheckCircle2,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react'
import type { MedicationTask } from '@/hooks/useCaregiverTasks'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { useAuthStore } from '@/stores/auth.store'

interface Props {
  title: string
  medications: MedicationTask[]
  onViewResident: (residentId: string) => void
  onAdministerMedication?: (medicationId: string, residentId: string, scheduledTime: string) => void
  isLoading?: boolean
}

export function MedicationsSection({
  title,
  medications,
  onViewResident,
  onAdministerMedication,
  isLoading,
}: Props) {
  const { user } = useAuthStore()
  const { hasPermission } = usePermissions()
  const canAdministerMedications = hasPermission(PermissionType.ADMINISTER_MEDICATIONS)

  // Responsável técnico não precisa ver aviso sobre POPs (ele é quem os cria)
  const isTechnicalManager = user?.profile?.positionCode === 'TECHNICAL_MANAGER'

  // Estado de paginação
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filtrar apenas medicações PENDENTES (não administradas)
  const pendingMedications = medications.filter((m) => !m.wasAdministered)

  // Ordenar por horário programado
  const sortedMedications = [...pendingMedications].sort((a, b) =>
    a.scheduledTime.localeCompare(b.scheduledTime),
  )

  // Calcular paginação
  const totalPages = Math.ceil(sortedMedications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedMedications = sortedMedications.slice(startIndex, endIndex)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!medications || medications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Pill className="w-12 h-12 mx-auto mb-3" />
            <p>Nenhuma medicação agendada para hoje</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Mostrar mensagem se não há pendentes (todas foram administradas)
  if (pendingMedications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            0 pendentes de {medications.length}
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-success">
            <Pill className="w-12 h-12 mx-auto mb-3" />
            <p className="font-medium">Todas as medicações foram administradas!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Nenhuma medicação pendente no momento
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const pendingCount = pendingMedications.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {pendingCount} pendente{pendingCount !== 1 ? 's' : ''} de{' '}
          {medications.length}
        </p>
      </CardHeader>
      <CardContent>
        {/* Lista de medicações */}
        <div className="space-y-2">
          {paginatedMedications.map((medication, index) => (
            <div
              key={`${medication.medicationId}-${medication.scheduledTime}-${index}`}
              className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                medication.wasAdministered
                  ? 'bg-muted/50 border-border'
                  : 'bg-card border-border'
              }`}
            >
              {/* Icon + Time */}
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                    medication.wasAdministered ? 'bg-muted' : 'bg-muted/50'
                  }`}
                >
                  <Pill
                    className={`w-4 h-4 ${
                      medication.wasAdministered
                        ? 'text-muted-foreground'
                        : 'text-primary'
                    }`}
                  />
                </div>
                <span className="text-sm font-medium text-muted-foreground min-w-[3rem]">
                  {medication.scheduledTime}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium truncate ${
                      medication.wasAdministered
                        ? 'text-muted-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {medication.medicationName} - {medication.presentation}
                  </span>
                  {medication.wasAdministered && (
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {medication.residentName}
                  {medication.wasAdministered &&
                    medication.actualTime &&
                    ` • Administrado às ${medication.actualTime}`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-1">
                {/* Botão Administrar - apenas se: não foi administrado + usuário tem permissão + handler existe */}
                {!medication.wasAdministered && canAdministerMedications && onAdministerMedication && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onAdministerMedication(
                      medication.medicationId,
                      medication.residentId,
                      medication.scheduledTime
                    )}
                    className="px-2"
                    title="Administrar medicação"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                )}

                {/* Botão Visualizar */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewResident(medication.residentId)}
                  className="px-2"
                  title="Ver detalhes do residente"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Controles de paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1}-
              {Math.min(endIndex, sortedMedications.length)} de{' '}
              {sortedMedications.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Banner informativo - apenas para cuidadores e enfermeiros executores */}
        {!isTechnicalManager && (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {canAdministerMedications ? (
                <>
                  <strong>Autorização concedida.</strong> Você possui autorização
                  para administrar medicações. Siga rigorosamente o POP de
                  Administração de Medicamentos da instituição.
                </>
              ) : (
                <>
                  <strong>Visualização apenas.</strong> Apenas enfermeiros e
                  responsáveis técnicos podem administrar medicações.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
