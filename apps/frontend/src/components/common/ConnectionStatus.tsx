import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { Plug2, PlugZap, AlertCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ConnectionStatusProps {
  containerClassName?: string
  iconClassName?: string
}

/**
 * Indicador de Status de Conexão WebSocket
 *
 * COMPORTAMENTO:
 * - Conectado: Ícone de plug verde (só em hover) - discreto
 * - Desconectado: Ícone de plug energético amarelo pulsante - reconectando...
 * - Erro: Ícone vermelho - falha na autenticação/conexão
 *
 * UX:
 * - Aparece no header ao lado de notificações
 * - Tooltip explica o status atual
 * - Pulsação visual quando desconectado (atenção do usuário)
 */
export function ConnectionStatus({ containerClassName, iconClassName }: ConnectionStatusProps) {
  const { isConnected, error } = useWebSocketContext()
  const containerClasses = cn(
    'group flex h-10 w-10 cursor-default items-center justify-center rounded-md transition-colors hover:bg-accent/70',
    containerClassName
  )

  // Não renderizar nada se está conectado normalmente (modo discreto)
  // Só mostra quando há problema
  if (isConnected && !error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={containerClasses}>
              <Plug2 className={cn('h-5 w-5 text-success/60 group-hover:text-success/80', iconClassName)} />
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
            <div className={containerClasses}>
              <AlertCircle className={cn('h-5 w-5 text-danger animate-pulse', iconClassName)} />
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
          <div className={containerClasses}>
            <PlugZap
              className={cn(
                'h-5 w-5 text-warning',
                'animate-pulse', // Pulsação para chamar atenção
                iconClassName
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
