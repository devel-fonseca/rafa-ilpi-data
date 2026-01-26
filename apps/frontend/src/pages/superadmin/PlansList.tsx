import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { usePlans, useUpdatePlan, useTogglePlanPopular, useTogglePlanActive } from '@/hooks/usePlans'
import { Edit2, Star, Users, Home, Calendar, Check, X, Power, Plus, Lock, Search, Filter, Eye, LayoutGrid, Table2 } from 'lucide-react'
import type { Plan, UpdatePlanDto, PlanType } from '@/api/plans.api'
import { AVAILABLE_FEATURES, CORE_FEATURES, featuresToArray, arrayToFeatures } from '@/constants/features'
import { CreatePlanDialog } from '@/components/superadmin/CreatePlanDialog'

/**
 * PlansList Page
 *
 * Página para gestão de Plans (Templates Globais).
 * SuperAdmin pode editar:
 * - Preço base (afeta NOVOS tenants, não os existentes)
 * - maxUsers e maxResidents
 * - displayName
 * - isPopular (destaque visual)
 */
export function PlansList() {
  const navigate = useNavigate()
  const { data: plans, isLoading } = usePlans()
  const updatePlanMutation = useUpdatePlan()
  const togglePopularMutation = useTogglePlanPopular()
  const toggleActiveMutation = useTogglePlanActive()

  // Estados de edição
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [formData, setFormData] = useState<UpdatePlanDto>({})
  const [features, setFeatures] = useState<string[]>([])
  const [newFeature, setNewFeature] = useState('')

  // Estados de filtros e busca
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<PlanType | 'ALL'>('ALL')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setFormData({
      price: plan.price ? parseFloat(plan.price) : undefined,
      annualDiscountPercent: plan.annualDiscountPercent ? parseFloat(plan.annualDiscountPercent) : 0,
      maxUsers: plan.maxUsers,
      maxResidents: plan.maxResidents,
      displayName: plan.displayName,
      trialDays: plan.trialDays,
    })
    setFeatures(featuresToArray(plan.features))
    setNewFeature('')
  }

  const handleAddFeature = () => {
    if (newFeature.trim() && !features.includes(newFeature.trim())) {
      setFeatures([...features, newFeature.trim()])
      setNewFeature('')
    }
  }

  const handleRemoveFeature = (featureToRemove: string) => {
    setFeatures(features.filter(f => f !== featureToRemove))
  }

  const handleSave = () => {
    if (!editingPlan) return

    // Garantir que features CORE estejam sempre incluídas
    const allFeatures = [
      ...Array.from(CORE_FEATURES), // Features core sempre habilitadas
      ...features.filter(f => !(CORE_FEATURES as readonly string[]).includes(f)), // Features opcionais
    ]

    // Incluir features convertidas no formData
    const dataToSave = {
      ...formData,
      features: arrayToFeatures(allFeatures),
    }

    updatePlanMutation.mutate(
      { id: editingPlan.id, data: dataToSave },
      {
        onSuccess: () => {
          setEditingPlan(null)
          setFormData({})
          setFeatures([])
          setNewFeature('')
        },
      },
    )
  }

  const handleTogglePopular = (planId: string) => {
    togglePopularMutation.mutate(planId)
  }

  const handleToggleActive = (planId: string) => {
    toggleActiveMutation.mutate(planId)
  }

  // Filtrar e buscar planos
  const filteredPlans = useMemo(() => {
    if (!plans) return []

    return plans.filter((plan) => {
      // Filtro de busca por nome
      const matchesSearch =
        searchQuery === '' ||
        plan.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.name.toLowerCase().includes(searchQuery.toLowerCase())

      // Filtro por tipo
      const matchesType = filterType === 'ALL' || plan.type === filterType

      // Filtro por status
      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && plan.isActive) ||
        (filterStatus === 'INACTIVE' && !plan.isActive)

      return matchesSearch && matchesType && matchesStatus
    })
  }, [plans, searchQuery, filterType, filterStatus])

  const getPlanTypeColor = (type: string) => {
    const colors = {
      FREE: 'bg-gray-500/10 text-foreground/80 border-border/50/50',
      TRIAL: 'bg-primary/10 text-primary/80 border-primary/50',
      ESSENTIAL: 'bg-[#059669]/10 text-[#059669] border-[#059669]/50',
      PROFESSIONAL: 'bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/50',
      PREMIUM: 'bg-warning/10 text-warning/80 border-warning',
    }
    return colors[type as keyof typeof colors] || colors.ESSENTIAL
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestão de Planos</h1>
          <p className="text-slate-600 mt-2">
            Configure preços, limites e features dos templates de planos
          </p>
          <p className="text-sm text-slate-500 mt-1">
            ⚠️ Mudanças nos planos afetam apenas NOVAS assinaturas
          </p>
        </div>
        <CreatePlanDialog />
      </div>

      {/* Filtros e Busca */}
      <Card className="bg-white border-slate-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-slate-200 text-slate-900"
              />
            </div>

            {/* Filtro por Tipo */}
            <Select value={filterType} onValueChange={(value) => setFilterType(value as PlanType | 'ALL')}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                <SelectItem value="FREE">Gratuito</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="ESSENTIAL">Essential</SelectItem>
                <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                <SelectItem value="PREMIUM">Premium</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por Status */}
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as 'ALL' | 'ACTIVE' | 'INACTIVE')}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                <Power className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="ACTIVE">Ativos</SelectItem>
                <SelectItem value="INACTIVE">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contador de resultados e View Toggle */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {filteredPlans.length === plans?.length ? (
                <>Mostrando <span className="font-semibold">{filteredPlans.length}</span> planos</>
              ) : (
                <>
                  Mostrando <span className="font-semibold">{filteredPlans.length}</span> de{' '}
                  <span className="font-semibold">{plans?.length}</span> planos
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 border border-slate-200 rounded-md p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-7 px-2 ${
                    viewMode === 'grid'
                      ? 'bg-[#059669] text-white hover:bg-[#048558]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Visualização em grade"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={`h-7 px-2 ${
                    viewMode === 'table'
                      ? 'bg-[#059669] text-white hover:bg-[#048558]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Visualização em tabela comparativa"
                >
                  <Table2 className="h-4 w-4" />
                </Button>
              </div>

              {(searchQuery || filterType !== 'ALL' || filterStatus !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setFilterType('ALL')
                    setFilterStatus('ALL')
                  }}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
          <Card key={plan.id} className="bg-white border-slate-200 relative shadow-sm">
            {/* Popular Badge */}
            {plan.isPopular && (
              <div className="absolute -top-3 -right-3">
                <Badge className="bg-warning text-warning-foreground border-0 shadow-lg">
                  <Star className="h-3 w-3 mr-1" fill="currentColor" />
                  Popular
                </Badge>
              </div>
            )}

            {/* Inactive Badge */}
            {!plan.isActive && (
              <div className="absolute -top-3 -left-3">
                <Badge variant="destructive" className="border-0 shadow-lg">
                  Inativo
                </Badge>
              </div>
            )}

            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-900">{plan.displayName}</CardTitle>
                <Badge variant="outline" className={getPlanTypeColor(plan.type)}>
                  {plan.type}
                </Badge>
              </div>
              <CardDescription className="text-slate-600">
                {plan.billingCycle === 'MONTHLY' ? 'Mensal' : 'Anual'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Preço */}
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {plan.price ? `R$ ${parseFloat(plan.price).toFixed(2)}` : 'Grátis'}
                  {plan.price && (
                    <span className="text-sm font-normal text-slate-500">/mês</span>
                  )}
                </p>
              </div>

              {/* Limites */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="h-4 w-4" />
                  <span>
                    {plan.maxUsers} {plan.maxUsers === 1 ? 'usuário' : 'usuários'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Home className="h-4 w-4" />
                  <span>
                    {plan.maxResidents} {plan.maxResidents === 1 ? 'residente' : 'residentes'}
                  </span>
                </div>
                {plan.trialDays > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-4 w-4" />
                    <span>{plan.trialDays} dias de trial</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              {(plan.totalSubscriptions !== undefined || plan.activeSubscriptions !== undefined) && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    {plan.activeSubscriptions || 0} ativas / {plan.totalSubscriptions || 0} total
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                {/* Ver Detalhes */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/superadmin/plans/${plan.id}`)}
                  className="flex-1 min-w-[40px] border-[#059669] text-[#059669] hover:bg-[#059669]/10"
                  title="Ver detalhes e estatísticas"
                >
                  <Eye className="h-4 w-4" />
                </Button>

                {/* Editar */}
                <Dialog
                  open={editingPlan?.id === plan.id}
                  onOpenChange={(open) => !open && setEditingPlan(null)}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(plan)}
                      className="flex-1 min-w-[40px] border-slate-300 text-slate-700 hover:bg-slate-100"
                      title="Editar plano"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-slate-200 max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-slate-900">
                        Editar Plano: {editingPlan?.displayName}
                      </DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Mudanças afetam apenas novas assinaturas
                      </DialogDescription>
                    </DialogHeader>

                    <TooltipProvider>
                      <Tabs defaultValue="pricing" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-4">
                          <TabsTrigger value="pricing">💰 Preços</TabsTrigger>
                          <TabsTrigger value="limits">📊 Limites</TabsTrigger>
                          <TabsTrigger value="features">⚡ Features</TabsTrigger>
                        </TabsList>

                        {/* Tab: Preços */}
                        <TabsContent value="pricing" className="space-y-4 pr-2">
                          {/* Preço */}
                          <div className="space-y-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Label htmlFor="price" className="text-slate-600 cursor-help">
                                  Preço Mensal (R$) *
                                </Label>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Valor cobrado mensalmente por cada subscription ativa</p>
                              </TooltipContent>
                            </Tooltip>
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.price || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                              }
                              className={`bg-white border-slate-200 text-slate-900 ${
                                formData.price !== undefined && formData.price < 0
                                  ? 'border-red-500 focus:ring-red-500'
                                  : ''
                              }`}
                            />
                            {formData.price !== undefined && formData.price < 0 && (
                              <p className="text-xs text-red-600">⚠️ Preço não pode ser negativo</p>
                            )}
                          </div>

                          {/* Desconto Anual */}
                          <div className="space-y-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Label htmlFor="annualDiscountPercent" className="text-slate-600 cursor-help">
                                  Desconto Anual (%) 🎉
                                </Label>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Percentual de desconto automático aplicado quando o cliente escolhe pagamento anual</p>
                              </TooltipContent>
                            </Tooltip>
                            <Input
                              id="annualDiscountPercent"
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={formData.annualDiscountPercent || 0}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                setFormData({
                                  ...formData,
                                  annualDiscountPercent: Math.min(100, Math.max(0, value))
                                })
                              }}
                              className={`bg-white border-slate-200 text-slate-900 ${
                                formData.annualDiscountPercent !== undefined &&
                                (formData.annualDiscountPercent < 0 || formData.annualDiscountPercent > 100)
                                  ? 'border-red-500 focus:ring-red-500'
                                  : ''
                              }`}
                            />
                            <p className="text-xs text-slate-500">
                              Desconto percentual aplicado automaticamente a assinaturas anuais
                            </p>
                            {formData.annualDiscountPercent !== undefined &&
                             (formData.annualDiscountPercent < 0 || formData.annualDiscountPercent > 100) && (
                              <p className="text-xs text-red-600">⚠️ Desconto deve estar entre 0% e 100%</p>
                            )}
                            {formData.price && formData.annualDiscountPercent && formData.annualDiscountPercent > 0 && (
                              <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                                <p className="text-xs font-medium text-emerald-900 mb-1">
                                  💰 Previsão de Preços:
                                </p>
                                <div className="space-y-1">
                                  <p className="text-xs text-emerald-800">
                                    <span className="font-semibold">Mensal:</span> R$ {formData.price.toFixed(2)}/mês
                                  </p>
                                  <p className="text-xs text-emerald-800">
                                    <span className="font-semibold">Anual sem desconto:</span> R${' '}
                                    {(formData.price * 12).toFixed(2)}/ano
                                  </p>
                                  <p className="text-xs text-emerald-800">
                                    <span className="font-semibold">Anual com desconto:</span> R${' '}
                                    {(formData.price * 12 * (1 - formData.annualDiscountPercent / 100)).toFixed(2)}
                                    /ano
                                  </p>
                                  <p className="text-xs text-emerald-900 font-bold border-t border-emerald-300 pt-1 mt-1">
                                    Economia: R${' '}
                                    {(formData.price * 12 * (formData.annualDiscountPercent / 100)).toFixed(2)} por ano (
                                    {formData.annualDiscountPercent}%)
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Display Name */}
                          <div className="space-y-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Label htmlFor="displayName" className="text-slate-600 cursor-help">
                                  Nome de Exibição
                                </Label>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Nome amigável exibido ao usuário na interface</p>
                              </TooltipContent>
                            </Tooltip>
                            <Input
                              id="displayName"
                              value={formData.displayName || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, displayName: e.target.value })
                              }
                              className="bg-white border-slate-200 text-slate-900"
                            />
                          </div>
                        </TabsContent>

                        {/* Tab: Limites */}
                        <TabsContent value="limits" className="space-y-4 pr-2">
                          {/* Max Users */}
                          <div className="space-y-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Label htmlFor="maxUsers" className="text-slate-600 cursor-help">
                                  Máximo de Usuários *
                                </Label>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Número máximo de usuários simultâneos permitidos neste plano</p>
                              </TooltipContent>
                            </Tooltip>
                            <Input
                              id="maxUsers"
                              type="number"
                              min="1"
                              value={formData.maxUsers || ''}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 1
                                setFormData({ ...formData, maxUsers: Math.max(1, value) })
                              }}
                              className={`bg-white border-slate-200 text-slate-900 ${
                                formData.maxUsers !== undefined && formData.maxUsers < 1
                                  ? 'border-red-500 focus:ring-red-500'
                                  : ''
                              }`}
                            />
                            {formData.maxUsers !== undefined && formData.maxUsers < 1 && (
                              <p className="text-xs text-red-600">⚠️ Deve haver pelo menos 1 usuário</p>
                            )}
                          </div>

                          {/* Max Residents */}
                          <div className="space-y-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Label htmlFor="maxResidents" className="text-slate-600 cursor-help">
                                  Máximo de Residentes *
                                </Label>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Número máximo de residentes que podem ser cadastrados neste plano</p>
                              </TooltipContent>
                            </Tooltip>
                            <Input
                              id="maxResidents"
                              type="number"
                              min="1"
                              value={formData.maxResidents || ''}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 1
                                setFormData({
                                  ...formData,
                                  maxResidents: Math.max(1, value),
                                })
                              }}
                              className={`bg-white border-slate-200 text-slate-900 ${
                                formData.maxResidents !== undefined && formData.maxResidents < 1
                                  ? 'border-red-500 focus:ring-red-500'
                                  : ''
                              }`}
                            />
                            {formData.maxResidents !== undefined && formData.maxResidents < 1 && (
                              <p className="text-xs text-red-600">⚠️ Deve haver pelo menos 1 residente</p>
                            )}
                          </div>

                          {/* Trial Days */}
                          <div className="space-y-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Label htmlFor="trialDays" className="text-slate-600 cursor-help">
                                  Dias de Trial
                                </Label>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Período de teste gratuito em dias antes de iniciar cobrança (0 = sem trial)</p>
                              </TooltipContent>
                            </Tooltip>
                            <Input
                              id="trialDays"
                              type="number"
                              min="0"
                              value={formData.trialDays || ''}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0
                                setFormData({ ...formData, trialDays: Math.max(0, value) })
                              }}
                              className="bg-white border-slate-200 text-slate-900"
                            />
                            <p className="text-xs text-slate-500">
                              Período de teste gratuito antes da cobrança (0 = sem trial)
                            </p>
                          </div>
                        </TabsContent>

                        {/* Tab: Features */}
                        <TabsContent value="features" className="space-y-4 pr-2">
                          <div className="space-y-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Label className="text-slate-600 cursor-help">Features do Plano</Label>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Configure quais funcionalidades estarão disponíveis neste plano</p>
                              </TooltipContent>
                            </Tooltip>

                        {/* Features FIXAS (Core - sempre habilitadas) */}
                        <div className="p-3 bg-slate-50 rounded-md border border-slate-300">
                          <div className="flex items-center gap-2 mb-2">
                            <Lock className="h-3 w-3 text-slate-600" />
                            <p className="text-xs font-medium text-slate-700">
                              Features Core (sempre habilitadas em todos os planos):
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {CORE_FEATURES.map((feature, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="bg-slate-200 text-slate-700 border border-slate-300"
                              >
                                <Lock className="h-3 w-3 mr-1" />
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Features OPCIONAIS selecionadas */}
                        {features.filter(f => !(CORE_FEATURES as readonly string[]).includes(f)).length > 0 && (
                          <div className="p-3 bg-emerald-50 rounded-md border border-emerald-200">
                            <p className="text-xs font-medium text-emerald-900 mb-2">
                              Features Opcionais Ativas ({features.filter(f => !(CORE_FEATURES as readonly string[]).includes(f)).length}):
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {features
                                .filter(f => !(CORE_FEATURES as readonly string[]).includes(f))
                                .map((feature, idx) => (
                                  <Badge
                                    key={idx}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700 pr-1"
                                  >
                                    {feature}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFeature(feature)}
                                      className="ml-2 hover:text-danger/20"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Features OPCIONAIS disponíveis (excluindo core features) */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-slate-600">
                            Features opcionais disponíveis ({AVAILABLE_FEATURES.filter(f => !features.includes(f) && !(CORE_FEATURES as readonly string[]).includes(f)).length}) - clique para adicionar:
                          </p>
                          <div className="flex flex-wrap gap-2 p-3 bg-primary/5 rounded-md border border-primary/30 max-h-48 overflow-y-auto">
                            {AVAILABLE_FEATURES.filter(
                              f => !features.includes(f) && !(CORE_FEATURES as readonly string[]).includes(f)
                            ).map((feature, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="cursor-pointer bg-white border-primary/30 text-primary/80 hover:bg-primary/10 hover:border-primary/40"
                                onClick={() => {
                                  setFeatures([...features, feature])
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Input para feature customizada */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-slate-600">Ou adicione uma feature customizada:</p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Digite uma feature customizada..."
                              value={newFeature}
                              onChange={(e) => setNewFeature(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleAddFeature()
                                }
                              }}
                              className="bg-white border-slate-200 text-slate-900"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleAddFeature}
                              className="bg-[#059669] hover:bg-[#048558]"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </TooltipProvider>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setEditingPlan(null)}
                        className="border-slate-200 text-slate-900 hover:bg-slate-100"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={updatePlanMutation.isPending}
                        className="bg-[#059669] hover:bg-slate-600"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Popular */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTogglePopular(plan.id)}
                  disabled={togglePopularMutation.isPending}
                  className={`flex-1 min-w-[40px] border-slate-300 hover:bg-slate-100 ${
                    plan.isPopular ? 'bg-warning/10 text-warning' : 'text-slate-700'
                  }`}
                  title={plan.isPopular ? 'Desmarcar como popular' : 'Marcar como popular'}
                >
                  <Star
                    className="h-4 w-4"
                    fill={plan.isPopular ? 'currentColor' : 'none'}
                  />
                </Button>

                {/* Ativar/Desativar */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleActive(plan.id)}
                  disabled={toggleActiveMutation.isPending}
                  className={`flex-1 min-w-[40px] border-slate-300 hover:bg-slate-100 ${
                    plan.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                  }`}
                  title={plan.isActive ? 'Desativar plano' : 'Ativar plano'}
                >
                  <Power className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* Plans Table Comparison View */}
      {viewMode === 'table' && (
        <Card className="bg-white border-slate-200 overflow-x-auto">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10">
                      Característica
                    </th>
                    {filteredPlans.map((plan) => (
                      <th key={plan.id} className="text-center p-4 min-w-[200px]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">{plan.displayName}</span>
                            <Badge variant="outline" className={getPlanTypeColor(plan.type)}>
                              {plan.type}
                            </Badge>
                          </div>
                          {plan.isPopular && (
                            <Badge className="bg-warning text-warning-foreground">
                              <Star className="h-3 w-3 mr-1" fill="currentColor" />
                              Popular
                            </Badge>
                          )}
                          {!plan.isActive && (
                            <Badge variant="destructive">Inativo</Badge>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Preço */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 text-sm font-medium text-slate-700 sticky left-0 bg-white z-10">
                      💰 Preço
                    </td>
                    {filteredPlans.map((plan) => (
                      <td key={plan.id} className="p-4 text-center">
                        <p className="text-lg font-bold text-slate-900">
                          {plan.price ? `R$ ${parseFloat(plan.price).toFixed(2)}` : 'Grátis'}
                        </p>
                        {plan.price && (
                          <p className="text-xs text-slate-500">/mês</p>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Desconto Anual */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 text-sm font-medium text-slate-700 sticky left-0 bg-white z-10">
                      🎉 Desconto Anual
                    </td>
                    {filteredPlans.map((plan) => {
                      const discount = plan.annualDiscountPercent ? parseFloat(plan.annualDiscountPercent) : 0
                      return (
                        <td key={plan.id} className="p-4 text-center">
                          {discount > 0 ? (
                            <Badge className="bg-emerald-600 text-white">
                              {discount.toFixed(0)}% OFF
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Usuários */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 text-sm font-medium text-slate-700 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Usuários
                      </div>
                    </td>
                    {filteredPlans.map((plan) => (
                      <td key={plan.id} className="p-4 text-center">
                        <span className="text-sm font-semibold text-slate-900">{plan.maxUsers}</span>
                      </td>
                    ))}
                  </tr>

                  {/* Residentes */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 text-sm font-medium text-slate-700 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Residentes
                      </div>
                    </td>
                    {filteredPlans.map((plan) => (
                      <td key={plan.id} className="p-4 text-center">
                        <span className="text-sm font-semibold text-slate-900">{plan.maxResidents}</span>
                      </td>
                    ))}
                  </tr>

                  {/* Trial */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 text-sm font-medium text-slate-700 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Período Trial
                      </div>
                    </td>
                    {filteredPlans.map((plan) => (
                      <td key={plan.id} className="p-4 text-center">
                        {plan.trialDays > 0 ? (
                          <span className="text-sm font-semibold text-[#059669]">
                            {plan.trialDays} dias
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Subscriptions */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-4 text-sm font-medium text-slate-700 sticky left-0 bg-white z-10">
                      📊 Subscriptions
                    </td>
                    {filteredPlans.map((plan) => (
                      <td key={plan.id} className="p-4 text-center">
                        <div className="text-xs text-slate-600">
                          <p>
                            <span className="font-semibold text-emerald-600">{plan.activeSubscriptions || 0}</span> ativas
                          </p>
                          <p className="text-slate-400">
                            {plan.totalSubscriptions || 0} total
                          </p>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Ações */}
                  <tr className="bg-slate-50">
                    <td className="p-4 text-sm font-medium text-slate-700 sticky left-0 bg-slate-50 z-10">
                      ⚙️ Ações
                    </td>
                    {filteredPlans.map((plan) => (
                      <td key={plan.id} className="p-4">
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/superadmin/plans/${plan.id}`)}
                            className="w-full border-[#059669] text-[#059669] hover:bg-[#059669]/10"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver Detalhes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(plan)}
                            className="w-full border-slate-300 text-slate-700 hover:bg-slate-100"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
