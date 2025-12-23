import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { usePlans, useUpdatePlan, useTogglePlanPopular, useTogglePlanActive } from '@/hooks/usePlans'
import { Edit2, Star, Users, Home, Calendar, Check, X, Power, Plus } from 'lucide-react'
import type { Plan, UpdatePlanDto } from '@/api/plans.api'
import { AVAILABLE_FEATURES, featuresToArray, arrayToFeatures } from '@/constants/features'

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
  const { data: plans, isLoading } = usePlans()
  const updatePlanMutation = useUpdatePlan()
  const togglePopularMutation = useTogglePlanPopular()
  const toggleActiveMutation = useTogglePlanActive()

  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [formData, setFormData] = useState<UpdatePlanDto>({})
  const [features, setFeatures] = useState<string[]>([])
  const [newFeature, setNewFeature] = useState('')

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setFormData({
      price: plan.price ? parseFloat(plan.price) : undefined,
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

    // Incluir features convertidas no formData
    const dataToSave = {
      ...formData,
      features: arrayToFeatures(features),
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

  const getPlanTypeColor = (type: string) => {
    const colors = {
      FREE: 'bg-gray-500/10 text-gray-700 border-gray-500/50',
      TRIAL: 'bg-blue-500/10 text-blue-700 border-blue-500/50',
      ESSENTIAL: 'bg-[#059669]/10 text-[#059669] border-[#059669]/50',
      PROFESSIONAL: 'bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/50',
      PREMIUM: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/50',
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestão de Planos</h1>
        <p className="text-slate-600 mt-2">
          Configure preços, limites e features dos templates de planos
        </p>
        <p className="text-sm text-slate-500 mt-1">
          ⚠️ Mudanças nos planos afetam apenas NOVAS assinaturas
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {plans?.map((plan) => (
          <Card key={plan.id} className="bg-white border-slate-200 relative shadow-sm">
            {/* Popular Badge */}
            {plan.isPopular && (
              <div className="absolute -top-3 -right-3">
                <Badge className="bg-yellow-500 text-yellow-900 border-0 shadow-lg">
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
              <div className="flex gap-2 pt-2">
                <Dialog
                  open={editingPlan?.id === plan.id}
                  onOpenChange={(open) => !open && setEditingPlan(null)}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(plan)}
                      className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
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

                    <div className="space-y-4 py-4 pr-2">
                      {/* Preço */}
                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-slate-600">
                          Preço Mensal (R$)
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.price || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                          }
                          className="bg-white border-slate-200 text-slate-900"
                        />
                      </div>

                      {/* Max Users */}
                      <div className="space-y-2">
                        <Label htmlFor="maxUsers" className="text-slate-600">
                          Máximo de Usuários
                        </Label>
                        <Input
                          id="maxUsers"
                          type="number"
                          min="1"
                          value={formData.maxUsers || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 1 })
                          }
                          className="bg-white border-slate-200 text-slate-900"
                        />
                      </div>

                      {/* Max Residents */}
                      <div className="space-y-2">
                        <Label htmlFor="maxResidents" className="text-slate-600">
                          Máximo de Residentes
                        </Label>
                        <Input
                          id="maxResidents"
                          type="number"
                          min="1"
                          value={formData.maxResidents || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxResidents: parseInt(e.target.value) || 1,
                            })
                          }
                          className="bg-white border-slate-200 text-slate-900"
                        />
                      </div>

                      {/* Trial Days */}
                      <div className="space-y-2">
                        <Label htmlFor="trialDays" className="text-slate-600">
                          Dias de Trial
                        </Label>
                        <Input
                          id="trialDays"
                          type="number"
                          min="0"
                          value={formData.trialDays || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })
                          }
                          className="bg-white border-slate-200 text-slate-900"
                        />
                      </div>

                      {/* Display Name */}
                      <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-slate-600">
                          Nome de Exibição
                        </Label>
                        <Input
                          id="displayName"
                          value={formData.displayName || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, displayName: e.target.value })
                          }
                          className="bg-white border-slate-200 text-slate-900"
                        />
                      </div>

                      {/* Features */}
                      <div className="space-y-3">
                        <Label className="text-slate-600">Features do Plano</Label>

                        {/* Features selecionadas */}
                        {features.length > 0 && (
                          <div className="p-3 bg-emerald-50 rounded-md border border-emerald-200">
                            <p className="text-xs font-medium text-emerald-900 mb-2">Features Ativas:</p>
                            <div className="flex flex-wrap gap-2">
                              {features.map((feature, idx) => (
                                <Badge
                                  key={idx}
                                  className="bg-emerald-600 text-white hover:bg-emerald-700 pr-1"
                                >
                                  {feature}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFeature(feature)}
                                    className="ml-2 hover:text-red-200"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Features sugeridas (disponíveis para adicionar) */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-slate-600">Clique para adicionar:</p>
                          <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-md border border-blue-200 max-h-48 overflow-y-auto">
                            {AVAILABLE_FEATURES.filter(f => !features.includes(f)).map((feature, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="cursor-pointer bg-white border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400"
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
                    </div>

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

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTogglePopular(plan.id)}
                  disabled={togglePopularMutation.isPending}
                  className={`border-slate-300 hover:bg-slate-100 ${
                    plan.isPopular ? 'bg-yellow-100 text-yellow-600' : 'text-slate-700'
                  }`}
                >
                  <Star
                    className="h-4 w-4"
                    fill={plan.isPopular ? 'currentColor' : 'none'}
                  />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleActive(plan.id)}
                  disabled={toggleActiveMutation.isPending}
                  className={`border-slate-300 hover:bg-slate-100 ${
                    plan.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
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
    </div>
  )
}
