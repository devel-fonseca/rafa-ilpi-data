import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useApplySubscriptionDiscount,
  useApplySubscriptionCustomPrice,
  useRemoveSubscriptionDiscount,
} from '@/hooks/usePlans'
import { Percent, DollarSign, Trash2 } from 'lucide-react'

interface ApplyDiscountDialogProps {
  subscriptionId: string
  currentDiscount?: {
    discountPercent?: string | null
    discountReason?: string | null
    customPrice?: string | null
  }
  planPrice: string | null
  trigger?: React.ReactNode
}

/**
 * ApplyDiscountDialog
 *
 * Dialog para aplicar desconto percentual OU preço customizado a uma subscription.
 *
 * Features:
 * - Tab 1: Desconto Percentual (0-100%)
 * - Tab 2: Preço Customizado (override total)
 * - Botão para remover desconto existente
 * - Validações de input
 */
export function ApplyDiscountDialog({
  subscriptionId,
  currentDiscount,
  planPrice,
  trigger,
}: ApplyDiscountDialogProps) {
  const [open, setOpen] = useState(false)
  const [discountPercent, setDiscountPercent] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [reason, setReason] = useState('')

  const applyDiscountMutation = useApplySubscriptionDiscount()
  const applyCustomPriceMutation = useApplySubscriptionCustomPrice()
  const removeDiscountMutation = useRemoveSubscriptionDiscount()

  const hasDiscount =
    currentDiscount?.discountPercent !== null || currentDiscount?.customPrice !== null

  const handleApplyDiscount = () => {
    const percent = parseFloat(discountPercent)
    if (isNaN(percent) || percent < 0 || percent > 100) {
      return
    }
    if (!reason.trim()) {
      return
    }

    applyDiscountMutation.mutate(
      {
        subscriptionId,
        data: { discountPercent: percent, reason: reason.trim() },
      },
      {
        onSuccess: () => {
          setOpen(false)
          setDiscountPercent('')
          setReason('')
        },
      },
    )
  }

  const handleApplyCustomPrice = () => {
    const price = parseFloat(customPrice)
    if (isNaN(price) || price < 0) {
      return
    }
    if (!reason.trim()) {
      return
    }

    applyCustomPriceMutation.mutate(
      {
        subscriptionId,
        data: { customPrice: price, reason: reason.trim() },
      },
      {
        onSuccess: () => {
          setOpen(false)
          setCustomPrice('')
          setReason('')
        },
      },
    )
  }

  const handleRemoveDiscount = () => {
    if (confirm('Tem certeza que deseja remover o desconto/preço customizado?')) {
      removeDiscountMutation.mutate(subscriptionId, {
        onSuccess: () => {
          setOpen(false)
        },
      })
    }
  }

  const calculateDiscountedPrice = () => {
    if (!planPrice || !discountPercent) return null
    const price = parseFloat(planPrice)
    const percent = parseFloat(discountPercent)
    if (isNaN(price) || isNaN(percent)) return null
    return (price * (1 - percent / 100)).toFixed(2)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            variant="outline"
            className="border-slate-200 text-slate-900 hover:bg-slate-100"
          >
            <Percent className="h-4 w-4 mr-2" />
            {hasDiscount ? 'Editar Desconto' : 'Aplicar Desconto'}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="bg-white border-slate-200 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Configurar Preço</DialogTitle>
          <DialogDescription className="text-slate-400">
            Aplique desconto percentual ou defina preço customizado
          </DialogDescription>
        </DialogHeader>

        {/* Current Discount Badge */}
        {hasDiscount && (
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-3">
            <p className="text-sm font-medium text-slate-600 mb-1">Desconto Atual:</p>
            {currentDiscount?.discountPercent && (
              <p className="text-slate-900">
                {parseFloat(currentDiscount.discountPercent).toFixed(0)}% de desconto
              </p>
            )}
            {currentDiscount?.customPrice && (
              <p className="text-slate-900">
                Preço customizado: R$ {parseFloat(currentDiscount.customPrice).toFixed(2)}
              </p>
            )}
            {currentDiscount?.discountReason && (
              <p className="text-xs text-slate-500 mt-1">{currentDiscount.discountReason}</p>
            )}
          </div>
        )}

        <Tabs defaultValue="discount" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-200">
            <TabsTrigger value="discount" className="data-[state=active]:bg-[#059669]">
              <Percent className="h-4 w-4 mr-2" />
              Desconto %
            </TabsTrigger>
            <TabsTrigger value="custom" className="data-[state=active]:bg-[#059669]">
              <DollarSign className="h-4 w-4 mr-2" />
              Preço Fixo
            </TabsTrigger>
          </TabsList>

          {/* Desconto Percentual */}
          <TabsContent value="discount" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discount-percent" className="text-slate-600">
                Desconto Percentual (0-100%)
              </Label>
              <Input
                id="discount-percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Ex: 20"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="bg-white border-slate-200 text-slate-900"
              />
              {planPrice && discountPercent && (
                <p className="text-xs text-slate-500">
                  Preço original: R$ {parseFloat(planPrice).toFixed(2)} → Novo preço: R${' '}
                  {calculateDiscountedPrice()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount-reason" className="text-slate-600">
                Razão do Desconto
              </Label>
              <Textarea
                id="discount-reason"
                placeholder="Ex: Promoção Black Friday, Cliente VIP"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-white border-slate-200 text-slate-900"
                rows={3}
              />
            </div>

            <Button
              onClick={handleApplyDiscount}
              disabled={
                applyDiscountMutation.isPending ||
                !discountPercent ||
                !reason.trim() ||
                parseFloat(discountPercent) < 0 ||
                parseFloat(discountPercent) > 100
              }
              className="w-full bg-[#059669] hover:bg-slate-600"
            >
              Aplicar Desconto
            </Button>
          </TabsContent>

          {/* Preço Customizado */}
          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-price" className="text-slate-600">
                Preço Customizado (R$)
              </Label>
              <Input
                id="custom-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 149.90"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="bg-white border-slate-200 text-slate-900"
              />
              {planPrice && customPrice && (
                <p className="text-xs text-slate-500">
                  Preço original: R$ {parseFloat(planPrice).toFixed(2)} → Substituído por: R${' '}
                  {parseFloat(customPrice).toFixed(2)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-reason" className="text-slate-600">
                Razão do Preço Customizado
              </Label>
              <Textarea
                id="custom-reason"
                placeholder="Ex: Contrato especial, Acordo comercial"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-white border-slate-200 text-slate-900"
                rows={3}
              />
            </div>

            <Button
              onClick={handleApplyCustomPrice}
              disabled={
                applyCustomPriceMutation.isPending ||
                !customPrice ||
                !reason.trim() ||
                parseFloat(customPrice) < 0
              }
              className="w-full bg-[#059669] hover:bg-slate-600"
            >
              Aplicar Preço Customizado
            </Button>
          </TabsContent>
        </Tabs>

        {/* Remove Discount Button */}
        {hasDiscount && (
          <DialogFooter className="border-t border-slate-200 pt-4">
            <Button
              variant="outline"
              onClick={handleRemoveDiscount}
              disabled={removeDiscountMutation.isPending}
              className="w-full border-danger/70 text-danger/40 hover:bg-danger/90/50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover Desconto/Preço Customizado
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
