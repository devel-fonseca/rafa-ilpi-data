import { useState, useEffect } from 'react'
import { Settings2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useCustomizeTenantLimits, useTenantEffectiveLimits } from '@/hooks/useSuperAdmin'
import { useToast } from '@/components/ui/use-toast'
import type { Tenant } from '@/api/superadmin.api'

interface CustomizeLimitsDialogProps {
  tenant: Tenant
}

export function CustomizeLimitsDialog({ tenant }: CustomizeLimitsDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const customizeMutation = useCustomizeTenantLimits()
  const { data: effectiveLimits } = useTenantEffectiveLimits(tenant.id, open)

  // Form state
  const [customMaxUsers, setCustomMaxUsers] = useState<number | null>(null)
  const [customMaxResidents, setCustomMaxResidents] = useState<number | null>(null)
  const [enableUsersOverride, setEnableUsersOverride] = useState(false)
  const [enableResidentsOverride, setEnableResidentsOverride] = useState(false)
  const [customFeatures, setCustomFeatures] = useState<Record<string, boolean>>({})

  // Atualizar form quando effectiveLimits carrega
  useEffect(() => {
    if (effectiveLimits) {
      const hasUsersOverride = effectiveLimits.customOverrides.customMaxUsers !== null
      const hasResidentsOverride = effectiveLimits.customOverrides.customMaxResidents !== null

      setEnableUsersOverride(hasUsersOverride)
      setEnableResidentsOverride(hasResidentsOverride)
      setCustomMaxUsers(effectiveLimits.customOverrides.customMaxUsers)
      setCustomMaxResidents(effectiveLimits.customOverrides.customMaxResidents)
      setCustomFeatures(effectiveLimits.customOverrides.customFeatures || {})
    }
  }, [effectiveLimits])

  const handleSubmit = async () => {
    try {
      await customizeMutation.mutateAsync({
        tenantId: tenant.id,
        data: {
          customMaxUsers: enableUsersOverride ? customMaxUsers : null,
          customMaxResidents: enableResidentsOverride ? customMaxResidents : null,
          customFeatures: Object.keys(customFeatures).length > 0 ? customFeatures : null,
        },
      })

      toast({
        title: '✓ Limites customizados',
        description: `Os limites de "${tenant.name}" foram atualizados com sucesso.`,
      })
      setOpen(false)
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        title: 'Falha ao customizar limites',
        description:
          errorResponse?.data?.message ||
          'Ocorreu um erro ao atualizar os limites. Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveAll = async () => {
    if (!confirm('Remover todas as customizações? O tenant voltará a usar os limites do plano base.')) {
      return
    }

    try {
      await customizeMutation.mutateAsync({
        tenantId: tenant.id,
        data: {
          customMaxUsers: null,
          customMaxResidents: null,
          customFeatures: null,
        },
      })

      toast({
        title: '✓ Customizações removidas',
        description: `"${tenant.name}" voltou a usar os limites do plano base.`,
      })
      setOpen(false)
    } catch (error: unknown) {
      toast({
        title: 'Falha ao remover customizações',
        description: 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const activeSub = tenant.subscriptions.find((s) => s.status === 'active' || s.status === 'trialing')
  const basePlan = activeSub?.plan

  // Funções helper para manipular features
  const toggleFeature = (featureKey: string, currentValue: boolean) => {
    setCustomFeatures((prev) => {
      const newFeatures = { ...prev }
      // Se o valor for igual ao base do plano, remover override (null = usa plano)
      const basePlanFeatures = (basePlan?.features as Record<string, boolean>) || {}
      if (currentValue === basePlanFeatures[featureKey]) {
        delete newFeatures[featureKey]
      } else {
        newFeatures[featureKey] = currentValue
      }
      return newFeatures
    })
  }

  const getEffectiveFeatureValue = (featureKey: string): boolean => {
    // Ordem de resolução: custom → base → false
    if (customFeatures[featureKey] !== undefined) {
      return customFeatures[featureKey]
    }
    const basePlanFeatures = (basePlan?.features as Record<string, boolean>) || {}
    return basePlanFeatures[featureKey] || false
  }

  const hasFeatureOverride = (featureKey: string): boolean => {
    return customFeatures[featureKey] !== undefined
  }

  // Lista todas as features disponíveis (união de base + customs)
  const allFeatureKeys = Array.from(
    new Set([
      ...Object.keys((basePlan?.features as Record<string, boolean>) || {}),
      ...Object.keys(customFeatures),
    ])
  ).sort()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-200 text-slate-900 hover:bg-slate-100"
        >
          <Settings2 className="h-4 w-4 mr-2" />
          Customizar Limites
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-slate-200 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Customizar Limites do Tenant</DialogTitle>
          <DialogDescription className="text-slate-400">
            Sobrescreva os limites do plano base para {tenant.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informação do Plano Base */}
          <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Plano Base</span>
              {effectiveLimits?.hasCustomizations && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  Customizado
                </Badge>
              )}
            </div>
            <div className="text-lg font-semibold text-slate-900">
              {basePlan?.displayName || 'Nenhum plano'}
            </div>
            {basePlan && (
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Usuários: </span>
                  <span className="font-medium text-slate-900">
                    {basePlan.maxUsers === -1 ? 'Ilimitado' : basePlan.maxUsers}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Residentes: </span>
                  <span className="font-medium text-slate-900">
                    {basePlan.maxResidents === -1 ? 'Ilimitado' : basePlan.maxResidents}
                  </span>
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-slate-200" />

          {/* Customização de Usuários */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="users-override" className="text-slate-600 font-medium">
                  Limite de Usuários
                </Label>
                <p className="text-xs text-slate-400 mt-1">
                  Sobrescrever limite do plano base
                </p>
              </div>
              <Switch
                id="users-override"
                checked={enableUsersOverride}
                onCheckedChange={setEnableUsersOverride}
              />
            </div>
            {enableUsersOverride && (
              <div className="pl-4 space-y-2">
                <Label htmlFor="custom-max-users" className="text-slate-600 text-sm">
                  Limite Customizado
                </Label>
                <Input
                  id="custom-max-users"
                  type="number"
                  min="1"
                  value={customMaxUsers ?? ''}
                  onChange={(e) => setCustomMaxUsers(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder={`Base: ${basePlan?.maxUsers === -1 ? 'Ilimitado' : basePlan?.maxUsers}`}
                  className="bg-white border-slate-200 text-slate-900"
                />
                <p className="text-xs text-slate-500">
                  Plano base: {basePlan?.maxUsers === -1 ? 'Ilimitado' : basePlan?.maxUsers} usuários
                  {customMaxUsers && customMaxUsers !== basePlan?.maxUsers && (
                    <span className="ml-2 text-blue-600 font-medium">
                      → Efetivo: {customMaxUsers}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          <Separator className="bg-slate-200" />

          {/* Customização de Residentes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="residents-override" className="text-slate-600 font-medium">
                  Limite de Residentes
                </Label>
                <p className="text-xs text-slate-400 mt-1">
                  Sobrescrever limite do plano base
                </p>
              </div>
              <Switch
                id="residents-override"
                checked={enableResidentsOverride}
                onCheckedChange={setEnableResidentsOverride}
              />
            </div>
            {enableResidentsOverride && (
              <div className="pl-4 space-y-2">
                <Label htmlFor="custom-max-residents" className="text-slate-600 text-sm">
                  Limite Customizado
                </Label>
                <Input
                  id="custom-max-residents"
                  type="number"
                  min="1"
                  value={customMaxResidents ?? ''}
                  onChange={(e) =>
                    setCustomMaxResidents(e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder={`Base: ${basePlan?.maxResidents === -1 ? 'Ilimitado' : basePlan?.maxResidents}`}
                  className="bg-white border-slate-200 text-slate-900"
                />
                <p className="text-xs text-slate-400">
                  Plano base: {basePlan?.maxResidents === -1 ? 'Ilimitado' : basePlan?.maxResidents} residentes
                  {customMaxResidents && customMaxResidents !== basePlan?.maxResidents && (
                    <span className="ml-2 text-blue-600 font-medium">
                      → Efetivo: {customMaxResidents}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          <Separator className="bg-slate-200" />

          {/* Customização de Features */}
          <div className="space-y-3">
            <div>
              <Label className="text-slate-600 font-medium">Features do Plano</Label>
              <p className="text-xs text-slate-400 mt-1">
                Adicione ou remova features individuais. Valores em azul foram customizados.
              </p>
            </div>

            {allFeatureKeys.length > 0 ? (
              <div className="pl-4 space-y-2 max-h-60 overflow-y-auto">
                {allFeatureKeys.map((featureKey) => {
                  const effectiveValue = getEffectiveFeatureValue(featureKey)
                  const isOverridden = hasFeatureOverride(featureKey)
                  const basePlanFeatures = (basePlan?.features as Record<string, boolean>) || {}
                  const baseValue = basePlanFeatures[featureKey] || false

                  return (
                    <div
                      key={featureKey}
                      className={`flex items-center justify-between p-2 rounded ${
                        isOverridden ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex-1">
                        <Label
                          htmlFor={`feature-${featureKey}`}
                          className={`text-sm ${isOverridden ? 'text-blue-700 font-medium' : 'text-slate-600'}`}
                        >
                          {featureKey}
                        </Label>
                        {isOverridden && (
                          <p className="text-xs text-blue-600 mt-0.5">
                            Base: {baseValue ? '✓ Ativo' : '✗ Inativo'} → Custom:{' '}
                            {effectiveValue ? '✓ Ativo' : '✗ Inativo'}
                          </p>
                        )}
                      </div>
                      <Switch
                        id={`feature-${featureKey}`}
                        checked={effectiveValue}
                        onCheckedChange={(checked) => toggleFeature(featureKey, checked)}
                      />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 pl-4">Nenhuma feature disponível no plano base.</p>
            )}
          </div>

          {/* Preview dos Limites Efetivos */}
          {(enableUsersOverride || enableResidentsOverride || Object.keys(customFeatures).length > 0) && (
            <>
              <Separator className="bg-slate-200" />
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-900 mb-2">
                  📊 Limites Efetivos (após customização)
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Usuários: </span>
                    <span className="font-semibold text-blue-900">
                      {enableUsersOverride && customMaxUsers
                        ? customMaxUsers
                        : basePlan?.maxUsers === -1
                          ? 'Ilimitado'
                          : basePlan?.maxUsers}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Residentes: </span>
                    <span className="font-semibold text-blue-900">
                      {enableResidentsOverride && customMaxResidents
                        ? customMaxResidents
                        : basePlan?.maxResidents === -1
                          ? 'Ilimitado'
                          : basePlan?.maxResidents}
                    </span>
                  </div>
                  {Object.keys(customFeatures).length > 0 && (
                    <div className="col-span-2">
                      <span className="text-blue-700">Features customizadas: </span>
                      <span className="font-semibold text-blue-900">
                        {Object.keys(customFeatures).length} override{Object.keys(customFeatures).length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {effectiveLimits?.hasCustomizations && (
              <Button
                variant="outline"
                onClick={handleRemoveAll}
                disabled={customizeMutation.isPending}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-2" />
                Remover Customizações
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-slate-200 text-slate-900 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={customizeMutation.isPending || (!enableUsersOverride && !enableResidentsOverride && Object.keys(customFeatures).length === 0)}
              className="bg-[#059669] hover:bg-slate-600 text-white"
            >
              {customizeMutation.isPending ? 'Salvando...' : 'Salvar Customizações'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
