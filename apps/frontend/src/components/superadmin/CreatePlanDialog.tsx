import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useCreatePlan } from '@/hooks/usePlans'
import { Check, X, Plus, Lock } from 'lucide-react'
import type { CreatePlanDto, PlanType, BillingCycle } from '@/api/plans.api'
import { AVAILABLE_FEATURES, CORE_FEATURES, arrayToFeatures } from '@/constants/features'

/**
 * CreatePlanDialog Component
 *
 * Dialog para criar novos planos no sistema.
 * Funcionalidades:
 * - Validação de campos obrigatórios
 * - Preview de preço anual
 * - Gestão de features
 * - Geração automática de nome técnico
 */

interface CreatePlanDialogProps {
  trigger?: React.ReactNode
}

export function CreatePlanDialog({ trigger }: CreatePlanDialogProps) {
  const createPlanMutation = useCreatePlan()

  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<CreatePlanDto>>({
    type: 'ESSENTIAL',
    billingCycle: 'MONTHLY',
    price: 0,
    annualDiscountPercent: 0,
    maxUsers: 5,
    maxResidents: 30,
    trialDays: 14,
    isPopular: false,
    isActive: true,
  })
  const [features, setFeatures] = useState<string[]>([...CORE_FEATURES])
  const [newFeature, setNewFeature] = useState('')

  // Gerar nome técnico automaticamente baseado no displayName
  const generateTechnicalName = (displayName: string, _type: PlanType, cycle: BillingCycle): string => {
    const cleanName = displayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .trim()
      .replace(/\s+/g, '_') // Substitui espaços por underscores

    const cyclePrefix = cycle === 'MONTHLY' ? 'monthly' : 'annual'
    return `plan_${cleanName}_${cyclePrefix}`.toLowerCase()
  }

  const handleAddFeature = () => {
    if (newFeature.trim() && !features.includes(newFeature.trim())) {
      setFeatures([...features, newFeature.trim()])
      setNewFeature('')
    }
  }

  const handleRemoveFeature = (featureToRemove: string) => {
    // Não permitir remover features core
    if (!(CORE_FEATURES as readonly string[]).includes(featureToRemove)) {
      setFeatures(features.filter(f => f !== featureToRemove))
    }
  }

  const handleCreate = () => {
    if (!formData.displayName || !formData.type || !formData.billingCycle) {
      return
    }

    const planData: CreatePlanDto = {
      name: generateTechnicalName(formData.displayName, formData.type, formData.billingCycle),
      displayName: formData.displayName,
      type: formData.type,
      billingCycle: formData.billingCycle,
      price: formData.price || 0,
      annualDiscountPercent: formData.annualDiscountPercent || 0,
      maxUsers: formData.maxUsers || 1,
      maxResidents: formData.maxResidents || 1,
      trialDays: formData.trialDays || 0,
      isPopular: formData.isPopular || false,
      isActive: formData.isActive !== undefined ? formData.isActive : true,
      features: arrayToFeatures(features),
    }

    createPlanMutation.mutate(planData, {
      onSuccess: () => {
        setOpen(false)
        // Reset form
        setFormData({
          type: 'ESSENTIAL',
          billingCycle: 'MONTHLY',
          price: 0,
          annualDiscountPercent: 0,
          maxUsers: 5,
          maxResidents: 30,
          trialDays: 14,
          isPopular: false,
          isActive: true,
        })
        setFeatures([...CORE_FEATURES])
        setNewFeature('')
      },
    })
  }

  const isFormValid = formData.displayName && formData.type && formData.billingCycle

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-[#059669] hover:bg-[#048558]">
            <Plus className="h-4 w-4 mr-2" />
            Criar Novo Plano
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-white border-slate-200 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Criar Novo Plano</DialogTitle>
          <DialogDescription className="text-slate-600">
            Preencha os dados do novo plano. Campos marcados com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="basic">📋 Básico</TabsTrigger>
              <TabsTrigger value="limits">📊 Limites</TabsTrigger>
              <TabsTrigger value="features">⚡ Features</TabsTrigger>
            </TabsList>

            {/* Tab: Básico */}
            <TabsContent value="basic" className="space-y-4 pr-2">
              {/* Nome de Exibição */}
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor="displayName" className="text-slate-600 cursor-help">
                      Nome de Exibição *
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Nome amigável exibido ao usuário na interface</p>
                  </TooltipContent>
                </Tooltip>
                <Input
                  id="displayName"
                  value={formData.displayName || ''}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Ex: Essential, Professional, Premium"
                  className="bg-white border-slate-200 text-slate-900"
                />
                {formData.displayName && formData.type && formData.billingCycle && (
                  <p className="text-xs text-slate-500">
                    Nome técnico: <code className="bg-slate-100 px-1 py-0.5 rounded">{generateTechnicalName(formData.displayName, formData.type, formData.billingCycle)}</code>
                  </p>
                )}
              </div>

              {/* Tipo e Ciclo em Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Tipo do Plano */}
                <div className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="type" className="text-slate-600 cursor-help">
                        Tipo do Plano *
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Categoria do plano (FREE, TRIAL, ESSENTIAL, PROFESSIONAL, PREMIUM)</p>
                    </TooltipContent>
                  </Tooltip>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as PlanType })}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">Gratuito</SelectItem>
                      <SelectItem value="TRIAL">Trial</SelectItem>
                      <SelectItem value="ESSENTIAL">Essential</SelectItem>
                      <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                      <SelectItem value="PREMIUM">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Ciclo de Cobrança */}
                <div className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="billingCycle" className="text-slate-600 cursor-help">
                        Ciclo de Cobrança *
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Frequência de cobrança: mensal ou anual</p>
                    </TooltipContent>
                  </Tooltip>
                  <Select
                    value={formData.billingCycle}
                    onValueChange={(value) => setFormData({ ...formData, billingCycle: value as BillingCycle })}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                      <SelectValue placeholder="Selecione o ciclo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="ANNUAL">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-slate-200 text-slate-900"
                />
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
                  className="bg-white border-slate-200 text-slate-900"
                />
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
                        {(formData.price * 12 * (1 - formData.annualDiscountPercent / 100)).toFixed(2)}/ano
                      </p>
                      <p className="text-xs text-emerald-900 font-bold border-t border-emerald-300 pt-1 mt-1">
                        Economia: R$ {(formData.price * 12 * (formData.annualDiscountPercent / 100)).toFixed(2)} por ano
                        ({formData.annualDiscountPercent}%)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab: Limites */}
            <TabsContent value="limits" className="space-y-4 pr-2">
              {/* Limites em Grid */}
              <div className="grid grid-cols-2 gap-4">
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
                    className="bg-white border-slate-200 text-slate-900"
                  />
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
                      setFormData({ ...formData, maxResidents: Math.max(1, value) })
                    }}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
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
                          className="ml-2 hover:text-red-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Features OPCIONAIS disponíveis */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">
                Features opcionais disponíveis - clique para adicionar:
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
            onClick={() => setOpen(false)}
            className="border-slate-200 text-slate-900 hover:bg-slate-100"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!isFormValid || createPlanMutation.isPending}
            className="bg-[#059669] hover:bg-[#048558]"
          >
            <Check className="h-4 w-4 mr-2" />
            {createPlanMutation.isPending ? 'Criando...' : 'Criar Plano'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
