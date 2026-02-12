import { Ban, CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import { Section } from '@/design-system/components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { FinancialCategory, FinancialCategoryType } from '@/types/financial-operations'

interface CategoriesSectionProps {
  categories: FinancialCategory[]
  categoryById: Map<string, FinancialCategory>
  categorySearch: string
  categoryFilterType: '' | FinancialCategoryType
  showInactiveCategories: boolean
  canManageCategories: boolean
  onCategorySearchChange: (value: string) => void
  onCategoryFilterTypeChange: (value: '' | FinancialCategoryType) => void
  onShowInactiveChange: (value: boolean) => void
  onClearFilters: () => void
  onEdit: (category: FinancialCategory) => void
  onToggle: (category: FinancialCategory) => void
  onDelete: (category: FinancialCategory) => void
  typeLabel: (type: FinancialCategoryType) => string
}

export function CategoriesSection({
  categories,
  categoryById,
  categorySearch,
  categoryFilterType,
  showInactiveCategories,
  canManageCategories,
  onCategorySearchChange,
  onCategoryFilterTypeChange,
  onShowInactiveChange,
  onClearFilters,
  onEdit,
  onToggle,
  onDelete,
  typeLabel,
}: CategoriesSectionProps) {
  return (
    <div className="space-y-6">
      <Section title="Filtros de categorias" spacing="compact">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Busca</Label>
            <Input value={categorySearch} onChange={(event) => onCategorySearchChange(event.target.value)} placeholder="Nome ou descrição" />
          </div>
          <div>
            <Label>Tipo</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={categoryFilterType}
              onChange={(event) => onCategoryFilterTypeChange(event.target.value as '' | FinancialCategoryType)}
            >
              <option value="">Todos</option>
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showInactiveCategories} onChange={(event) => onShowInactiveChange(event.target.checked)} />
              Mostrar inativas
            </label>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Limpar
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Categorias financeiras" spacing="compact">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="font-medium">{category.name}</div>
                  {category.description && <div className="text-xs text-muted-foreground">{category.description}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant={category.type === 'INCOME' ? 'secondary' : 'outline'}>{typeLabel(category.type)}</Badge>
                </TableCell>
                <TableCell>{category.parent?.name || categoryById.get(category.parentCategoryId || '')?.name || '-'}</TableCell>
                <TableCell>
                  <Badge variant={category.isActive ? 'default' : 'outline'}>{category.isActive ? 'Ativa' : 'Inativa'}</Badge>
                </TableCell>
                <TableCell>
                  <TooltipProvider delayDuration={200}>
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={!canManageCategories || category.isSystemDefault}
                            onClick={() => onEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar categoria</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={!canManageCategories || category.isSystemDefault}
                            onClick={() => onToggle(category)}
                          >
                            {category.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{category.isActive ? 'Desativar categoria' : 'Ativar categoria'}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={!canManageCategories || category.isSystemDefault}
                            onClick={() => onDelete(category)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir categoria</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhuma categoria encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Section>
    </div>
  )
}
