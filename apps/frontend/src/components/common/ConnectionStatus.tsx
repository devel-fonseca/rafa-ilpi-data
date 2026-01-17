import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { WifiOff, Wifi, AlertCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Indicador de Status de Conexão WebSocket
 *
 * COMPORTAMENTO:
 * - Conectado: Ícone verde (só em hover) - discreto
 * - Desconectado: Ícone amarelo pulsante - reconectando...
 * - Erro: Ícone vermelho - falha na autenticação/conexão
 *
 * UX:
 * - Aparece no header ao lado de notificações
 * - Tooltip explica o status atual
 * - Pulsação visual quando desconectado (atenção do usuário)
 */
export function ConnectionStatus() {
  const { isConnected, error } = useWebSocketContext()

  // Não renderizar nada se está conectado normalmente (modo discreto)
  // Só mostra quando há problema
  if (isConnected && !error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-10 h-10">
              <Wifi className="h-5 w-5 text-success/60" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Conectado ao servidor em tempo real</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Estado: Erro de autenticação ou conexão
  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-10 h-10">
              <AlertCircle className="h-5 w-5 text-danger animate-pulse" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">Erro de Conexão</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              {error}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Estado: Desconectado (reconectando...)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center w-10 h-10">
            <WifiOff
              className={cn(
                'h-5 w-5 text-warning',
                'animate-pulse' // Pulsação para chamar atenção
              )}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">Reconectando...</p>
          <p className="text-xs text-muted-foreground">
            Tentando restabelecer conexão em tempo real
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
