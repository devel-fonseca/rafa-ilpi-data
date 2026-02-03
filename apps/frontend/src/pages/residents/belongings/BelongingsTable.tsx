import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MoreHorizontal, Edit, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'

import {
  BelongingStatus,
  CATEGORY_LABELS,
  CONSERVATION_STATE_LABELS,
  STATUS_LABELS,
  type ResidentBelonging,
} from '@/types/belongings'

interface BelongingsTableProps {
  belongings: ResidentBelonging[]
  isLoading?: boolean
  selectedItems: string[]
  onSelectAll: () => void
  onSelectItem: (id: string) => void
  onEdit: (belonging: ResidentBelonging) => void
  onStatusChange: (belonging: ResidentBelonging) => void
  onDelete: (belonging: ResidentBelonging) => void
  pagination: {
    page: number
    totalPages: number
    total: number
    limit: number
    onPageChange: (page: number) => void
  }
}

function getStatusBadgeVariant(status: BelongingStatus) {
  switch (status) {
    case BelongingStatus.EM_GUARDA:
      return 'default'
    case BelongingStatus.DEVOLVIDO:
      return 'secondary'
    case BelongingStatus.EXTRAVIADO:
      return 'destructive'
    case BelongingStatus.DESCARTADO:
      return 'outline'
    default:
      return 'default'
  }
}

export function BelongingsTable({
  belongings,
  isLoading,
  selectedItems,
  onSelectAll,
  onSelectItem,
  onEdit,
  onStatusChange,
  onDelete,
  pagination,
}: BelongingsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Data Entrada</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (belongings.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        Nenhum pertence encontrado
      </div>
    )
  }

  const allSelected = belongings.length > 0 && selectedItems.length === belongings.length

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-center">Qtd</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Data Entrada</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {belongings.map((belonging) => (
              <TableRow key={belonging.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedItems.includes(belonging.id)}
                    onCheckedChange={() => onSelectItem(belonging.id)}
                    aria-label={`Selecionar ${belonging.description}`}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{belonging.description}</p>
                    {belonging.brandModel && (
                      <p className="text-sm text-muted-foreground">{belonging.brandModel}</p>
                    )}
                    {belonging.identification && (
                      <p className="text-xs text-muted-foreground">{belonging.identification}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {CATEGORY_LABELS[belonging.category]}
                </TableCell>
                <TableCell className="text-center">{belonging.quantity}</TableCell>
                <TableCell className="text-sm">
                  {CONSERVATION_STATE_LABELS[belonging.conservationState]}
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(belonging.entryDate), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(belonging.status)}>
                    {STATUS_LABELS[belonging.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      {belonging.status === BelongingStatus.EM_GUARDA && (
                        <>
                          <DropdownMenuItem onClick={() => onEdit(belonging)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onStatusChange(belonging)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Alterar Status
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(belonging)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} até{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} itens
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
