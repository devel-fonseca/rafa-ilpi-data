import { useState, useEffect, useMemo } from 'react'
import { Settings2, X, Plus, Lock } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCustomizeTenantLimits, useTenantEffectiveLimits } from '@/hooks/useSuperAdmin'
import { useToast } from '@/components/ui/use-toast'
import { CORE_FEATURES, FEATURES_MAP } from '@/constants/features'
import type { Tenant } from '@/api/superadmin.api'

// Helper para obter nome humanizado de uma feature
const getFeatureName = (key: string): string => FEATURES_MAP[key] || key

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
  const basePlanFeatures = (basePlan?.features as Record<string, boolean>) || {}

  // Features assinadas (snapshot no momento da assinatura)
  const subscribedFeatures = (activeSub?.subscribedFeatures as Record<string, boolean>) || {}

  // Se não houver snapshot, usar features do plano como fallback
  const baseFeatures = Object.keys(subscribedFeatures).length > 0
    ? subscribedFeatures
    : basePlanFeatures

  const availableFeatureKeys = useMemo(
    () =>
      Object.keys(FEATURES_MAP).filter(
        (featureKey) =>
          !featureKey.includes(' ') &&
          !(CORE_FEATURES as readonly string[]).includes(featureKey) &&
          !(baseFeatures && baseFeatures[featureKey] === true) &&
          customFeatures[featureKey] !== true
      ),
    [baseFeatures, customFeatures]
  )

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

        {/* Informação do Plano Base */}
        <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Assinatura Atual</span>
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
            <>
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
              {Object.keys(subscribedFeatures).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-300">
                  <p className="text-xs text-slate-500 mb-2">
                    📦 Features assinadas (snapshot do momento da contratação):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(subscribedFeatures)
                      .filter(([key, val]) => val === true && !(CORE_FEATURES as readonly string[]).includes(key))
                      .slice(0, 5)
                      .map(([feature], idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="bg-slate-200 text-slate-700 text-xs"
                        >
                          {getFeatureName(feature)}
                        </Badge>
                      ))}
                    {Object.entries(subscribedFeatures).filter(([key, val]) =>
                      val === true && !(CORE_FEATURES as readonly string[]).includes(key)
                    ).length > 5 && (
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-xs">
                        +{Object.entries(subscribedFeatures).filter(([key, val]) =>
                          val === true && !(CORE_FEATURES as readonly string[]).includes(key)
                        ).length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Tabs defaultValue="limits" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="limits">📊 Limites</TabsTrigger>
            <TabsTrigger value="features">⚡ Features</TabsTrigger>
            <TabsTrigger value="summary">📋 Resumo</TabsTrigger>
          </TabsList>

          {/* Tab: Limites */}
          <TabsContent value="limits" className="space-y-4 pr-2">
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
          </TabsContent>

          {/* Tab: Features */}
          <TabsContent value="features" className="space-y-4 pr-2">
            {/* Features Core (sempre habilitadas) */}
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
                    {getFeatureName(feature)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Features Assinadas (base do tenant) */}
            {baseFeatures && Object.entries(baseFeatures).filter(([key, val]) =>
              val === true && !(CORE_FEATURES as readonly string[]).includes(key)
            ).length > 0 && (
              <div className="p-3 bg-emerald-50 rounded-md border border-emerald-200">
                <p className="text-xs font-medium text-emerald-900 mb-2">
                  ✓ Features Assinadas (
                    {Object.entries(baseFeatures).filter(([key, val]) =>
                      val === true && !(CORE_FEATURES as readonly string[]).includes(key)
                    ).length}
                  ):
                </p>
                <p className="text-xs text-emerald-700 mb-2">
                  📦 Snapshot das features no momento da contratação. Clique para remover.
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(baseFeatures)
                    .filter(([key, val]) => val === true && !(CORE_FEATURES as readonly string[]).includes(key))
                    .map(([feature], idx) => {
                      const isRemoved = customFeatures[feature] === false

                      return (
                        <Badge
                          key={idx}
                          className={
                            isRemoved
                              ? 'bg-red-100 text-red-700 border border-red-300 line-through cursor-pointer hover:bg-red-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer pr-1'
                          }
                          onClick={() => {
                            setCustomFeatures((prev) => {
                              const next = { ...prev }
                              if (isRemoved) {
                                delete next[feature]
                              } else {
                                next[feature] = false
                              }
                              return next
                            })
                          }}
                        >
                          {getFeatureName(feature)}
                          {!isRemoved && (
                            <X className="h-3 w-3 ml-2" />
                          )}
                        </Badge>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Diferenças: Features do Plano Atual que não estão nas Features Assinadas */}
            {Object.keys(subscribedFeatures).length > 0 && Object.entries(basePlanFeatures).filter(([key, val]) =>
              val === true &&
              !(CORE_FEATURES as readonly string[]).includes(key) &&
              !subscribedFeatures[key]
            ).length > 0 && (
              <div className="p-3 bg-amber-50 rounded-md border border-amber-200">
                <p className="text-xs font-medium text-amber-900 mb-2">
                  🔄 Novas Features do Plano Atual (
                    {Object.entries(basePlanFeatures).filter(([key, val]) =>
                      val === true &&
                      !(CORE_FEATURES as readonly string[]).includes(key) &&
                      !subscribedFeatures[key]
                    ).length}
                  ):
                </p>
                <p className="text-xs text-amber-700 mb-2">
                  ⚠️ Essas features estão no plano atual, mas não foram incluídas na assinatura original.
                  Adicione-as manualmente se desejar.
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(basePlanFeatures)
                    .filter(([key, val]) =>
                      val === true &&
                      !(CORE_FEATURES as readonly string[]).includes(key) &&
                      !subscribedFeatures[key]
                    )
                    .map(([feature], idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="cursor-pointer bg-white border-amber-400 text-amber-700 hover:bg-amber-50"
                        onClick={() => {
                          setCustomFeatures((prev) => ({
                            ...prev,
                            [feature]: true,
                          }))
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {getFeatureName(feature)}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Features Disponíveis para Adicionar */}
            {availableFeatureKeys.length > 0 && (
              <div className="p-3 bg-white rounded-md border border-slate-200">
                <p className="text-xs font-medium text-slate-600 mb-2">
                  ➕ Adicionar Features ({availableFeatureKeys.length} disponíveis):
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableFeatureKeys.map((feature, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer bg-white border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                      onClick={() => {
                        setCustomFeatures((prev) => ({
                          ...prev,
                          [feature]: true,
                        }))
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {getFeatureName(feature)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Features Adicionadas (customizadas) */}
            {Object.entries(customFeatures).filter(([, val]) => val === true).length > 0 && (
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-xs font-medium text-blue-900 mb-2">
                  🎯 Features Adicionadas ({Object.entries(customFeatures).filter(([, val]) => val === true).length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(customFeatures)
                    .filter(([, val]) => val === true)
                    .map(([feature], idx) => (
                      <Badge
                        key={idx}
                        className="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer pr-1"
                        onClick={() => {
                          setCustomFeatures((prev) => {
                            const newFeatures = { ...prev }
                            delete newFeatures[feature]
                            return newFeatures
                          })
                        }}
                      >
                        {getFeatureName(feature)}
                        <X className="h-3 w-3 ml-2" />
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab: Resumo */}
          <TabsContent value="summary" className="space-y-4 pr-2">
            {(enableUsersOverride || enableResidentsOverride || Object.keys(customFeatures).length > 0) ? (
              <>
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-sm font-medium text-emerald-900 mb-3">
                    📊 Resumo das Customizações
                  </div>
                  <div className="space-y-3 text-sm">
                    {enableUsersOverride && (
                      <div className="flex justify-between items-center py-2 border-b border-emerald-200 last:border-0">
                        <span className="text-emerald-700 font-medium">Limite de Usuários:</span>
                        <span className="text-emerald-900">
                          <span className="font-bold">{customMaxUsers}</span>
                          <span className="text-xs ml-2 text-emerald-600">
                            (base: {basePlan?.maxUsers === -1 ? 'ilimitado' : basePlan?.maxUsers})
                          </span>
                        </span>
                      </div>
                    )}
                    {enableResidentsOverride && (
                      <div className="flex justify-between items-center py-2 border-b border-emerald-200 last:border-0">
                        <span className="text-emerald-700 font-medium">Limite de Residentes:</span>
                        <span className="text-emerald-900">
                          <span className="font-bold">{customMaxResidents}</span>
                          <span className="text-xs ml-2 text-emerald-600">
                            (base: {basePlan?.maxResidents === -1 ? 'ilimitado' : basePlan?.maxResidents})
                          </span>
                        </span>
                      </div>
                    )}
                    {Object.entries(customFeatures).filter(([, val]) => val === true).length > 0 && (
                      <div className="py-2 border-b border-emerald-200 last:border-0">
                        <span className="text-emerald-700 font-medium">Features Adicionadas:</span>
                        <span className="ml-2 font-bold text-emerald-900">
                          {Object.entries(customFeatures).filter(([, val]) => val === true).length}
                        </span>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Object.entries(customFeatures)
                            .filter(([, val]) => val === true)
                            .map(([feature], idx) => (
                              <Badge key={idx} className="bg-emerald-600 text-white text-xs">
                                {getFeatureName(feature)}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                    {Object.entries(customFeatures).filter(([, val]) => val === false).length > 0 && (
                      <div className="py-2">
                        <span className="text-emerald-700 font-medium">Features Removidas:</span>
                        <span className="ml-2 font-bold text-emerald-900">
                          {Object.entries(customFeatures).filter(([, val]) => val === false).length}
                        </span>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Object.entries(customFeatures)
                            .filter(([, val]) => val === false)
                            .map(([feature], idx) => (
                              <Badge key={idx} variant="outline" className="border-red-300 text-red-700 text-xs line-through">
                                {getFeatureName(feature)}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <p className="text-slate-500 text-sm">
                  ℹ️ Nenhuma customização aplicada ainda.
                </p>
                <p className="text-slate-400 text-xs mt-2">
                  Use as abas "Limites" e "Features" para customizar este tenant.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

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
