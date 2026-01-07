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
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { usePops, useDeletePop, usePopCategories } from '../../hooks/usePops'
import {
  PopStatus,
  PopCategory,
  PopStatusLabels,
  PopCategoryLabels,
  PopStatusColors,
  type FilterPopsDto,
} from '../../types/pop.types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PopsList() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<FilterPopsDto>({})
  const [deletePopId, setDeletePopId] = useState<string | null>(null)

  const { data: pops, isLoading } = usePops(filters)
  const { data: categories = [] } = usePopCategories()
  const deletePop = useDeletePop()

  const handleFilterChange = (key: keyof FilterPopsDto, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }))
  }

  const handleDelete = async () => {
    if (deletePopId) {
      await deletePop.mutateAsync(deletePopId)
      setDeletePopId(null)
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Procedimentos Operacionais Padrão
          </h1>
          <p className="text-muted-foreground">
            Gerencie os POPs da instituição conforme RDC 502/2021
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/pops/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo POP
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando POPs...
            </div>
          ) : !pops || pops.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                Nenhum POP encontrado
              </h3>
              <p className="text-sm text-muted-foreground">
                Comece criando seu primeiro POP
              </p>
              <Button className="mt-4" onClick={() => navigate('/dashboard/pops/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Criar POP
              </Button>
            </div>
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
                            onClick={() => setDeletePopId(pop.id)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletePopId}
        onOpenChange={(open) => !open && setDeletePopId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este POP? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
