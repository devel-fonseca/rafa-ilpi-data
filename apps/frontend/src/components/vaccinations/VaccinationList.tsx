import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDateLongSafe, extractDateOnly } from '@/utils/dateHelpers'
import { Trash2, Edit2, Plus, ExternalLink, Loader2, Printer } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useVaccinationsByResident, useDeleteVaccination, Vaccination } from '@/hooks/useVaccinations'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { VaccinationForm } from './VaccinationForm'
import { VaccinationPrintView } from './VaccinationPrintView'

interface VaccinationListProps {
  residentId: string
  residentName?: string
}

export function VaccinationList({ residentId, residentName }: VaccinationListProps) {
  const navigate = useNavigate()
  const [formOpen, setFormOpen] = useState(false)
  const [selectedVaccination, setSelectedVaccination] = useState<Vaccination | undefined>(undefined)
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

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover este registro de vacinação?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Vacinação removida com sucesso')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover vacinação')
    }
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setSelectedVaccination(undefined)
  }

  const handleFormSuccess = () => {
    handleFormClose()
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
                      onClick={() => handleDelete(vaccination.id)}
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
              {(vaccination.certificateUrl || vaccination.notes) && (
                <div className="space-y-2 border-t border-border/50 pt-3 text-xs">
                  {vaccination.certificateUrl && (
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Comprovante</p>
                      <a
                        href={vaccination.certificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Visualizar arquivo
                      </a>
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
    </Card>
  )
}
