import { useState, useRef } from 'react'
import { formatDateLongSafe, extractDateOnly } from '@/utils/dateHelpers'
import { Trash2, Edit2, Plus, Eye, Loader2, Printer, ShieldAlert } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { useVaccinationsByResident, Vaccination } from '@/hooks/useVaccinations'
import { useDeleteVaccination } from '@/hooks/useVaccinationVersioning'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { VaccinationForm } from './VaccinationForm'
import { VaccinationPrintView } from './VaccinationPrintView'
import { DocumentViewerModal } from '@/components/shared/DocumentViewerModal'

interface VaccinationListProps {
  residentId: string
  residentName?: string
}

export function VaccinationList({ residentId, residentName }: VaccinationListProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [selectedVaccination, setSelectedVaccination] = useState<Vaccination | undefined>(undefined)
  const [deletingVaccination, setDeletingVaccination] = useState<Vaccination | undefined>(undefined)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteReasonError, setDeleteReasonError] = useState('')
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false)
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string>('')
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState<string>('Comprovante de Vacinação')
  const printRef = useRef<HTMLDivElement>(null)

  // Verificar permissões
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission(PermissionType.CREATE_VACCINATIONS)
  const canUpdate = hasPermission(PermissionType.UPDATE_VACCINATIONS)
  const canDelete = hasPermission(PermissionType.DELETE_VACCINATIONS)

  const { data: vaccinations = [], isLoading, error } = useVaccinationsByResident(residentId)
  const deleteMutation = useDeleteVaccination()

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Registro_Vacinacoes_${residentId}_${extractDateOnly(new Date().toISOString())}`,
  })

  const handleEdit = (vaccination: Vaccination) => {
    setSelectedVaccination(vaccination)
    setFormOpen(true)
  }

  const handleDelete = (vaccination: Vaccination) => {
    setDeletingVaccination(vaccination)
  }

  const handleConfirmDelete = async () => {
    if (!deletingVaccination) return

    // Validação do motivo da exclusão
    const trimmedReason = deleteReason.trim()
    if (!trimmedReason || trimmedReason.length < 10) {
      setDeleteReasonError(
        'Motivo da exclusão deve ter no mínimo 10 caracteres (sem contar espaços)'
      )
      return
    }

    try {
      await deleteMutation.mutateAsync({
        id: deletingVaccination.id,
        deleteReason: trimmedReason,
      })
      setDeletingVaccination(undefined)
      setDeleteReason('')
      setDeleteReasonError('')
      // Sucesso é tratado automaticamente pelo hook (toast)
    } catch (error) {
      // Erro é tratado automaticamente pelo hook (toast)
    }
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setSelectedVaccination(undefined)
  }

  const handleFormSuccess = () => {
    handleFormClose()
  }

  const handleViewCertificate = async (filePath: string, title: string) => {
    try {
      const response = await api.get<{ url: string }>(`/files/download/${filePath}`)
      setSelectedDocumentUrl(response.data.url)
      setSelectedDocumentTitle(title)
      setDocumentViewerOpen(true)
    } catch (error) {
      toast.error('Erro ao carregar comprovante')
      console.error('Erro ao buscar URL do arquivo:', error)
    }
  }

  // Sort by date descending (most recent first)
  const sortedVaccinations = [...vaccinations].sort(
    (a, b) => b.date.localeCompare(a.date),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-danger/10 p-4 text-sm text-danger border border-danger/30">
        Erro ao carregar vacinações
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Histórico de Vacinações</CardTitle>
            {residentName && (
              <CardDescription>
                Vacinações registradas para {residentName}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="gap-2"
              disabled={sortedVaccinations.length === 0}
            >
              <Printer className="h-4 w-4" />
              Imprimir Registro
            </Button>
            {canCreate && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedVaccination(undefined)
                  setFormOpen(true)
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Registrar Vacinação
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedVaccinations.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-muted p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma vacinação registrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedVaccinations.map((vaccination) => (
            <div
              key={vaccination.id}
              className="rounded-lg border border-border p-4 hover:shadow-sm transition-shadow"
            >
              {/* Header com Vacina e Data */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-foreground">{vaccination.vaccine}</h4>
                  <p className="text-xs text-muted-foreground">
                    {formatDateLongSafe(vaccination.date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(vaccination)}
                      disabled={deleteMutation.isPending}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(vaccination)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Informações principais em grid */}
              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <p className="font-medium text-muted-foreground">Dose</p>
                  <p className="text-foreground">{vaccination.dose}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Lote</p>
                  <p className="text-foreground">{vaccination.batch}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Fabricante</p>
                  <p className="text-foreground">{vaccination.manufacturer}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">CNES</p>
                  <p className="text-foreground">{vaccination.cnes}</p>
                </div>
              </div>

              {/* Estabelecimento e Localização */}
              <div className="mb-3 pb-3 border-t border-border/50 pt-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-medium text-muted-foreground">Estabelecimento</p>
                    <p className="text-foreground">{vaccination.healthUnit}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Município / UF</p>
                    <p className="text-foreground">
                      {vaccination.municipality}, {vaccination.state}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comprovante e Observações */}
              {((vaccination.processedFileUrl || vaccination.certificateUrl) || vaccination.notes) && (
                <div className="space-y-2 border-t border-border/50 pt-3 text-xs">
                  {(vaccination.processedFileUrl || vaccination.certificateUrl) && (
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Comprovante</p>
                      <button
                        onClick={() => handleViewCertificate(
                          vaccination.processedFileUrl || vaccination.certificateUrl!,
                          `Comprovante - ${vaccination.vaccine} - ${vaccination.dose}`
                        )}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline"
                      >
                        <Eye className="h-3 w-3" />
                        Visualizar comprovante
                      </button>
                    </div>
                  )}
                  {vaccination.notes && (
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Observações</p>
                      <p className="text-foreground italic">{vaccination.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        )}
      </CardContent>

      <VaccinationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        residentId={residentId}
        vaccination={selectedVaccination}
        onSuccess={handleFormSuccess}
      />

      {/* Componente de impressão oculto (visível apenas na impressão) */}
      <div ref={printRef}>
        <VaccinationPrintView residentId={residentId} vaccinations={sortedVaccinations} />
      </div>

      {/* AlertDialog para Confirmação de Delete */}
      <AlertDialog
        open={!!deletingVaccination}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingVaccination(undefined)
            setDeleteReason('')
            setDeleteReasonError('')
          }
        }}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Vacinação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o registro de vacinação "{deletingVaccination?.vaccine}"
              ({deletingVaccination?.dose})?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Card Destacado - RDC 502/2021 */}
          <div className="bg-warning/5 dark:bg-warning/90/20 border border-warning/30 dark:border-warning/80 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-5 w-5 text-warning dark:text-warning/40 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-warning/90 dark:text-warning/20">
                  Rastreabilidade Obrigatória (RDC 502/2021 Art. 39)
                </p>
                <p className="text-xs text-warning/80 dark:text-warning/30 mt-1">
                  Toda exclusão de registro deve ter justificativa documentada para fins de
                  auditoria e conformidade regulatória.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="deleteReason"
                className="text-sm font-semibold text-warning/95 dark:text-warning/10"
              >
                Motivo da Exclusão <span className="text-danger">*</span>
              </Label>
              <Textarea
                id="deleteReason"
                placeholder="Ex: Registro duplicado - vacinação já estava cadastrada no sistema..."
                value={deleteReason}
                onChange={(e) => {
                  setDeleteReason(e.target.value)
                  setDeleteReasonError('')
                }}
                className={`min-h-[100px] ${deleteReasonError ? 'border-danger focus:border-danger' : ''}`}
              />
              {deleteReasonError && (
                <p className="text-sm text-danger mt-2">{deleteReasonError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Mínimo de 10 caracteres. Este motivo ficará registrado permanentemente no
                histórico de alterações.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteReason('')
                setDeleteReasonError('')
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Visualização de Comprovante */}
      <DocumentViewerModal
        open={documentViewerOpen}
        onOpenChange={setDocumentViewerOpen}
        documentUrl={selectedDocumentUrl}
        documentTitle={selectedDocumentTitle}
        documentType="auto"
      />
    </Card>
  )
}
