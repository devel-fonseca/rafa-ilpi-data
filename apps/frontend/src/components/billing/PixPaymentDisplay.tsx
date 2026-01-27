import { useState } from 'react'
import { Copy, Check, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface PixPaymentDisplayProps {
  pixPayload: string
  pixQrCodeId?: string
  amount: number
  dueDate: string
}

/**
 * PixPaymentDisplay
 *
 * Componente para exibir informações de pagamento PIX:
 * - Código copia-e-cola (payload)
 * - QR Code (se disponível)
 * - Informações de valor e vencimento
 */
export function PixPaymentDisplay({ pixPayload, amount, dueDate }: PixPaymentDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixPayload)
      setCopied(true)
      toast.success('Código PIX copiado!')

      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Erro ao copiar código PIX')
    }
  }

  return (
    <Card className="border-[#059669] bg-gradient-to-br from-emerald-50 to-white">
      <CardHeader>
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-[#059669]" />
          <CardTitle className="text-lg">Pagar com PIX</CardTitle>
        </div>
        <CardDescription>
          Valor: <span className="font-semibold text-foreground">R$ {amount.toFixed(2)}</span> •
          Vencimento: <span className="font-semibold text-foreground">
            {new Date(dueDate).toLocaleDateString('pt-BR')}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Código Copia e Cola */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Código PIX Copia e Cola:
          </label>
          <div className="flex gap-2">
            <div className="flex-1 p-3 bg-muted rounded-md border border-border overflow-x-auto">
              <code className="text-xs font-mono text-foreground break-all">
                {pixPayload}
              </code>
            </div>
            <Button
              onClick={handleCopy}
              variant="outline"
              size="icon"
              className="shrink-0 border-[#059669] text-[#059669] hover:bg-[#059669] hover:text-white"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Instruções */}
        <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
          <p className="font-medium text-foreground">Como pagar:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Abra o app do seu banco</li>
            <li>Selecione a opção "Pix Copia e Cola"</li>
            <li>Cole o código copiado acima</li>
            <li>Confirme o pagamento</li>
          </ol>
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ O pagamento é confirmado em alguns segundos após a conclusão.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
