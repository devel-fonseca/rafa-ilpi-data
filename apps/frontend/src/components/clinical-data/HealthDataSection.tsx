import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Plus, Edit, Droplet, Ruler, Activity, Trash2 } from 'lucide-react'
import {
  useResidentHealthSummary,
  useAnthropometryRecords,
  useDependencyAssessments,
  useDeleteAnthropometry,
} from '@/hooks/useResidentHealth'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import {
  BLOOD_TYPE_LABELS,
  DEPENDENCY_LEVEL_SHORT_LABELS,
  DEPENDENCY_LEVEL_COLORS,
  getBMIClassification,
  type ResidentAnthropometry,
  type ResidentDependencyAssessment,
} from '@/api/resident-health.api'
import { BloodTypeModal } from './BloodTypeModal'
import { AnthropometryModal } from './AnthropometryModal'
import { DependencyAssessmentModal } from './DependencyAssessmentModal'
import { DeleteReasonModal } from '@/components/modals/DeleteReasonModal'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface HealthDataSectionProps {
  residentId: string
}

export function HealthDataSection({ residentId }: HealthDataSectionProps) {
  // Estados dos modais
  const [bloodTypeModalOpen, setBloodTypeModalOpen] = useState(false)
  const [anthropometryModalOpen, setAnthropometryModalOpen] = useState(false)
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [deleteAnthropometryModalOpen, setDeleteAnthropometryModalOpen] = useState(false)

  // Estados para edição
  const [editingAnthropometry, setEditingAnthropometry] = useState<ResidentAnthropometry | null>(null)
  const [editingAssessment, setEditingAssessment] = useState<ResidentDependencyAssessment | null>(null)
  const [deletingAnthropometry, setDeletingAnthropometry] = useState<ResidentAnthropometry | null>(null)

  // Permissões
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission(PermissionType.UPDATE_CLINICAL_PROFILE)

  // Dados
  const { data: summary, isLoading: summaryLoading } = useResidentHealthSummary(residentId)
  const { data: anthropometryRecords = [], isLoading: anthropometryLoading } = useAnthropometryRecords(residentId, 5)
  const { data: assessments = [], isLoading: assessmentsLoading } = useDependencyAssessments(residentId)

  const deleteAnthropometryMutation = useDeleteAnthropometry()

  const isLoading = summaryLoading || anthropometryLoading || assessmentsLoading

  const handleEditAnthropometry = (record: ResidentAnthropometry) => {
    setEditingAnthropometry(record)
    setAnthropometryModalOpen(true)
  }

  const handleCreateAnthropometry = () => {
    setEditingAnthropometry(null)
    setAnthropometryModalOpen(true)
  }

  const handleEditAssessment = (assessment: ResidentDependencyAssessment) => {
    setEditingAssessment(assessment)
    setAssessmentModalOpen(true)
  }

  const handleCreateAssessment = () => {
    setEditingAssessment(null)
    setAssessmentModalOpen(true)
  }

  const handleDeleteAnthropometry = (record: ResidentAnthropometry) => {
    setDeletingAnthropometry(record)
    setDeleteAnthropometryModalOpen(true)
  }

  const confirmDeleteAnthropometry = async (reason: string) => {
    if (!deletingAnthropometry) return
    await deleteAnthropometryMutation.mutateAsync({
      id: deletingAnthropometry.id,
      deleteReason: reason,
    })
    setDeleteAnthropometryModalOpen(false)
    setDeletingAnthropometry(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Dados de Saúde</CardTitle>
          <CardDescription>
            Tipo sanguíneo, medidas antropométricas e avaliação de dependência
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo Sanguíneo */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Droplet className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Tipo Sanguíneo</div>
                {summary?.bloodType ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-bold">
                      {BLOOD_TYPE_LABELS[summary.bloodType.bloodType]}
                    </span>
                    {summary.bloodType.source && (
                      <Badge variant="outline" className="text-xs">
                        {summary.bloodType.source}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Não informado</span>
                )}
              </div>
            </div>
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBloodTypeModalOpen(true)}
              >
                {summary?.bloodType ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Antropometria */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium">Medidas Antropométricas</h4>
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={handleCreateAnthropometry}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Medição
                </Button>
              )}
            </div>

            {anthropometryRecords.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Altura</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>IMC</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anthropometryRecords.map((record, index) => {
                      const bmiClass = getBMIClassification(Number(record.bmi))
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {format(new Date(record.measurementDate), 'dd/MM/yyyy', { locale: ptBR })}
                            {index === 0 && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Atual
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{Number(record.height).toFixed(2)} m</TableCell>
                          <TableCell>{Number(record.weight).toFixed(1)} kg</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{Number(record.bmi).toFixed(1)}</span>
                              <Badge
                                variant={
                                  bmiClass.color === 'green'
                                    ? 'success'
                                    : bmiClass.color === 'yellow'
                                      ? 'warning'
                                      : 'danger'
                                }
                                className="text-xs"
                              >
                                {bmiClass.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {canEdit && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditAnthropometry(record)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteAnthropometry(record)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 border rounded-lg">
                <p className="text-sm text-muted-foreground">Nenhuma medição registrada</p>
              </div>
            )}
          </div>

          {/* Avaliação de Dependência */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium">Avaliação de Dependência (RDC 502/2021)</h4>
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={handleCreateAssessment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Avaliação
                </Button>
              )}
            </div>

            {summary?.currentAssessment ? (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        DEPENDENCY_LEVEL_COLORS[summary.currentAssessment.dependencyLevel] === 'green'
                          ? 'success'
                          : DEPENDENCY_LEVEL_COLORS[summary.currentAssessment.dependencyLevel] === 'yellow'
                            ? 'warning'
                            : 'danger'
                      }
                      className="text-sm px-3 py-1"
                    >
                      {DEPENDENCY_LEVEL_SHORT_LABELS[summary.currentAssessment.dependencyLevel]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Vigente
                    </Badge>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditAssessment(summary.currentAssessment!)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Instrumento: </span>
                    <span className="font-medium">
                      {summary.currentAssessment.assessmentInstrument}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data: </span>
                    <span className="font-medium">
                      {format(new Date(summary.currentAssessment.effectiveDate), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  {summary.currentAssessment.assessmentScore && (
                    <div>
                      <span className="text-muted-foreground">Pontuação: </span>
                      <span className="font-medium">
                        {Number(summary.currentAssessment.assessmentScore).toFixed(1)}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Auxílio Mobilidade: </span>
                    <span className="font-medium">
                      {summary.currentAssessment.mobilityAid
                        ? summary.currentAssessment.mobilityAidDescription || 'Sim'
                        : 'Não'}
                    </span>
                  </div>
                </div>

                {summary.currentAssessment.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Observações: </span>
                    <span>{summary.currentAssessment.notes}</span>
                  </div>
                )}

                {summary.currentAssessment.assessor && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Avaliado por: {summary.currentAssessment.assessor.name}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 border rounded-lg">
                <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada</p>
              </div>
            )}

            {/* Histórico de avaliações anteriores */}
            {assessments.length > 1 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">
                  Histórico de Avaliações
                </h5>
                <div className="space-y-2">
                  {assessments
                    .filter((a) => a.endDate !== null)
                    .slice(0, 3)
                    .map((assessment) => (
                      <div
                        key={assessment.id}
                        className="flex items-center justify-between p-2 border rounded text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {DEPENDENCY_LEVEL_SHORT_LABELS[assessment.dependencyLevel]}
                          </Badge>
                          <span className="text-muted-foreground">
                            {format(new Date(assessment.effectiveDate), 'dd/MM/yyyy', {
                              locale: ptBR,
                            })}
                            {' - '}
                            {assessment.endDate
                              ? format(new Date(assessment.endDate), 'dd/MM/yyyy', {
                                  locale: ptBR,
                                })
                              : 'Atual'}
                          </span>
                        </div>
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditAssessment(assessment)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modais */}
      <BloodTypeModal
        open={bloodTypeModalOpen}
        onOpenChange={setBloodTypeModalOpen}
        residentId={residentId}
        bloodType={summary?.bloodType}
      />

      <AnthropometryModal
        open={anthropometryModalOpen}
        onOpenChange={setAnthropometryModalOpen}
        residentId={residentId}
        anthropometry={editingAnthropometry}
      />

      <DependencyAssessmentModal
        open={assessmentModalOpen}
        onOpenChange={setAssessmentModalOpen}
        residentId={residentId}
        assessment={editingAssessment}
      />

      <DeleteReasonModal
        open={deleteAnthropometryModalOpen}
        onOpenChange={setDeleteAnthropometryModalOpen}
        title="Excluir Medição Antropométrica"
        description="Esta ação irá excluir a medição. Informe o motivo da exclusão."
        onConfirm={confirmDeleteAnthropometry}
        isLoading={deleteAnthropometryMutation.isPending}
      />
    </>
  )
}
