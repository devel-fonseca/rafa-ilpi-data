import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Plus,
  Package,
  FileText,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

import {
  listBelongings,
  getBelongingStats,
  deleteBelonging,
  listTerms,
} from '@/api/belongings.api'
import { residentsAPI } from '@/api/residents.api'
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  type ResidentBelonging,
  type QueryBelongingDto,
} from '@/types/belongings'

import { BelongingsTable } from './BelongingsTable'
import { BelongingFormDialog } from './BelongingFormDialog'
import { BelongingStatusDialog } from './BelongingStatusDialog'
import { TermsHistory } from './TermsHistory'
import { GenerateTermDialog } from './GenerateTermDialog'
import { StatsCards } from './StatsCards'

export function BelongingsPage() {
  const { residentId } = useParams<{ residentId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // State
  const [activeTab, setActiveTab] = useState<'items' | 'terms'>('items')
  const [query, setQuery] = useState<QueryBelongingDto>({
    page: 1,
    limit: 20,
    sortBy: 'entryDate',
    sortOrder: 'desc',
  })
  const [search, setSearch] = useState('')
  const [formDialog, setFormDialog] = useState<{
    open: boolean
    belonging?: ResidentBelonging
  }>({ open: false })
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean
    belonging?: ResidentBelonging
  }>({ open: false })
  const [termDialog, setTermDialog] = useState<{
    open: boolean
    selectedItems?: ResidentBelonging[]
  }>({ open: false })
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  // Queries
  const { data: resident, isLoading: loadingResident } = useQuery({
    queryKey: ['resident', residentId],
    queryFn: () => residentsAPI.getById(residentId!),
    enabled: !!residentId,
  })

  const { data: belongingsData, isLoading: loadingBelongings } = useQuery({
    queryKey: ['belongings', residentId, query],
    queryFn: () => listBelongings(residentId!, { ...query, search }),
    enabled: !!residentId,
  })

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['belongings-stats', residentId],
    queryFn: () => getBelongingStats(residentId!),
    enabled: !!residentId,
  })

  const { data: terms, isLoading: loadingTerms } = useQuery({
    queryKey: ['belonging-terms', residentId],
    queryFn: () => listTerms(residentId!),
    enabled: !!residentId && activeTab === 'terms',
  })

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (belongingId: string) => deleteBelonging(residentId!, belongingId),
    onSuccess: () => {
      toast.success('Pertence removido com sucesso')
      queryClient.invalidateQueries({ queryKey: ['belongings', residentId] })
      queryClient.invalidateQueries({ queryKey: ['belongings-stats', residentId] })
    },
    onError: () => {
      toast.error('Erro ao remover pertence')
    },
  })

  // Handlers
  const handleSearch = () => {
    setQuery((prev) => ({ ...prev, page: 1, search }))
  }

  const handleFilterChange = (key: keyof QueryBelongingDto, value: string | undefined) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      [key]: value === 'all' ? undefined : value,
    }))
  }

  const handleEdit = (belonging: ResidentBelonging) => {
    setFormDialog({ open: true, belonging })
  }

  const handleStatusChange = (belonging: ResidentBelonging) => {
    setStatusDialog({ open: true, belonging })
  }

  const handleDelete = (belonging: ResidentBelonging) => {
    if (confirm(`Deseja realmente remover o pertence "${belonging.description}"?`)) {
      deleteMutation.mutate(belonging.id)
    }
  }

  const handleGenerateTerm = () => {
    const items = belongingsData?.items.filter((b) => selectedItems.includes(b.id)) || []
    setTermDialog({ open: true, selectedItems: items })
  }

  const handleSelectAll = () => {
    if (selectedItems.length === belongingsData?.items.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(belongingsData?.items.map((b) => b.id) || [])
    }
  }

  const handleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  // Loading state
  if (loadingResident) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6" />
                Pertences
              </h1>
              <p className="text-muted-foreground">
                Gestão de pertences de{' '}
                <span className="font-medium">{resident?.fullName}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['belongings'] })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={() => setFormDialog({ open: true })}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pertence
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} isLoading={loadingStats} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'items' | 'terms')}>
          <TabsList>
            <TabsTrigger value="items" className="gap-2">
              <Package className="h-4 w-4" />
              Itens ({stats?.totals.totalItems || 0})
            </TabsTrigger>
            <TabsTrigger value="terms" className="gap-2">
              <FileText className="h-4 w-4" />
              Termos ({terms?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por descrição..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select
                    value={query.category || 'all'}
                    onValueChange={(v) => handleFilterChange('category', v)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas categorias</SelectItem>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={query.status || 'all'}
                    onValueChange={(v) => handleFilterChange('status', v)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos status</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleSearch}>
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Actions Bar */}
            {selectedItems.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.length} item(ns) selecionado(s)
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedItems([])}>
                    Limpar seleção
                  </Button>
                  <Button size="sm" onClick={handleGenerateTerm}>
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Termo
                  </Button>
                </div>
              </div>
            )}

            {/* Table */}
            <BelongingsTable
              belongings={belongingsData?.items || []}
              isLoading={loadingBelongings}
              selectedItems={selectedItems}
              onSelectAll={handleSelectAll}
              onSelectItem={handleSelectItem}
              onEdit={handleEdit}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              pagination={{
                page: belongingsData?.page || 1,
                totalPages: belongingsData?.totalPages || 1,
                total: belongingsData?.total || 0,
                limit: query.limit || 20,
                onPageChange: (page) => setQuery((prev) => ({ ...prev, page })),
              }}
            />
          </TabsContent>

          {/* Terms Tab */}
          <TabsContent value="terms">
            <TermsHistory
              residentId={residentId!}
              terms={terms || []}
              isLoading={loadingTerms}
              onGenerateTerm={() => setTermDialog({ open: true })}
            />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <BelongingFormDialog
          open={formDialog.open}
          onOpenChange={(open) => setFormDialog({ open })}
          residentId={residentId!}
          belonging={formDialog.belonging}
        />

        <BelongingStatusDialog
          open={statusDialog.open}
          onOpenChange={(open) => setStatusDialog({ open })}
          residentId={residentId!}
          belonging={statusDialog.belonging}
        />

        <GenerateTermDialog
          open={termDialog.open}
          onOpenChange={(open) => setTermDialog({ open })}
          residentId={residentId!}
          selectedItems={termDialog.selectedItems}
        />
    </div>
  )
}
