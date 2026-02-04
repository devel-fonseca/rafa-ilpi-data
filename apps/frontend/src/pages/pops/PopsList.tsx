import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  FileText,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
  GitBranch,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Page, PageHeader, Section, EmptyState } from '../../design-system/components'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { usePops, usePopCategories } from '../../hooks/usePops'
import {
  PopStatus,
  PopCategory,
  PopStatusLabels,
  PopCategoryLabels,
  PopStatusColors,
  type FilterPopsDto,
  type Pop,
} from '../../types/pop.types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DeletePOPModal } from '../../components/modals/DeletePOPModal'

export default function PopsList() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<FilterPopsDto>({})
  const [popToDelete, setPopToDelete] = useState<Pop | undefined>(undefined)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const { data: pops, isLoading } = usePops(filters)
  const { data: categories = [] } = usePopCategories()

  const handleFilterChange = (key: keyof FilterPopsDto, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }))
  }

  const handleDeleteClick = (pop: Pop) => {
    setPopToDelete(pop)
    setDeleteModalOpen(true)
  }

  const handleDeleteSuccess = () => {
    // Queries serão invalidadas automaticamente pelo modal
  }

  const getStatusIcon = (status: PopStatus) => {
    switch (status) {
      case PopStatus.DRAFT:
        return <Edit className="h-4 w-4" />
      case PopStatus.PUBLISHED:
        return <CheckCircle2 className="h-4 w-4" />
      case PopStatus.OBSOLETE:
        return <XCircle className="h-4 w-4" />
    }
  }

  return (
    <>
      <Page>
        <PageHeader
          title="Procedimentos Operacionais Padrão"
          subtitle="Gerencie os POPs da instituição conforme RDC 502/2021"
          actions={
            <Button onClick={() => navigate('/dashboard/pops/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Novo POP
            </Button>
          }
        />

        <Section title="Filtros">
          <Card>
            <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Input
                placeholder="Buscar por título..."
                value={filters.search || ''}
                onChange={(e) =>
                  handleFilterChange('search', e.target.value || undefined)
                }
              />
            </div>

            {/* Status */}
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value={PopStatus.DRAFT}>
                  {PopStatusLabels[PopStatus.DRAFT]}
                </SelectItem>
                <SelectItem value={PopStatus.PUBLISHED}>
                  {PopStatusLabels[PopStatus.PUBLISHED]}
                </SelectItem>
                <SelectItem value={PopStatus.OBSOLETE}>
                  {PopStatusLabels[PopStatus.OBSOLETE]}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Category */}
            <Select
              value={filters.category || 'all'}
              onValueChange={(value) => handleFilterChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {PopCategoryLabels[category as PopCategory] || category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Requires Review Filter */}
          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="requiresReview"
              checked={filters.requiresReview || false}
              onChange={(e) =>
                handleFilterChange(
                  'requiresReview',
                  e.target.checked ? true : undefined
                )
              }
              className="h-4 w-4 rounded border-border"
            />
            <label
              htmlFor="requiresReview"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Mostrar apenas POPs que precisam revisão
            </label>
          </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="POPs">
          <Card>
            <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando POPs...
            </div>
          ) : !pops || pops.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum POP encontrado"
              description="Comece criando seu primeiro POP"
              action={
                <Button onClick={() => navigate('/dashboard/pops/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar POP
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Próxima Revisão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pops.map((pop) => (
                  <TableRow key={pop.id}>
                    {/* Title */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(pop.status)}
                        <span>{pop.title}</span>
                        {pop.requiresReview && (
                          <Badge variant="destructive" className="ml-2">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Precisa Revisão
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Badge variant="outline">
                        {PopCategoryLabels[pop.category]}
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={PopStatusColors[pop.status]}>
                        {PopStatusLabels[pop.status]}
                      </Badge>
                    </TableCell>

                    {/* Version */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        <span className="text-sm">v{pop.version}</span>
                      </div>
                    </TableCell>

                    {/* Next Review */}
                    <TableCell>
                      {pop.nextReviewDate ? (
                        <span className="text-sm">
                          {format(
                            new Date(pop.nextReviewDate),
                            "dd/MM/yyyy",
                            { locale: ptBR }
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          N/A
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* View */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/dashboard/pops/${pop.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Edit (only DRAFT) */}
                        {pop.status === PopStatus.DRAFT && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/pops/${pop.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}

                        {/* History */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/dashboard/pops/${pop.id}/history`)}
                        >
                          <History className="h-4 w-4" />
                        </Button>

                        {/* Delete (only DRAFT) */}
                        {pop.status === PopStatus.DRAFT && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(pop)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
            </CardContent>
          </Card>
        </Section>
      </Page>

      {/* Delete Confirmation Modal */}
      <DeletePOPModal
        pop={popToDelete}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onSuccess={handleDeleteSuccess}
      />
    </>
  )
}
