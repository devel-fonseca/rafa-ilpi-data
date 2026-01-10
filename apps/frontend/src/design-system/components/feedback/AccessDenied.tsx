import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

interface AccessDeniedProps {
  message?: string
  showBackButton?: boolean
  backButtonText?: string
  backPath?: string
}

/**
 * Componente de feedback visual para acesso negado/sem permissão
 * Usado em páginas e rotas protegidas para indicar falta de permissões
 */
export function AccessDenied({
  message = 'Você não tem permissão para acessar esta página.',
  showBackButton = true,
  backButtonText = 'Voltar ao Dashboard',
  backPath = '/dashboard',
}: AccessDeniedProps) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
      <ShieldAlert className="h-16 w-16 text-destructive" />
      <div className="text-2xl font-semibold">Acesso Negado</div>
      <div className="text-muted-foreground text-center max-w-md">
        {message}
        <br />
        Entre em contato com o administrador caso precise de acesso.
      </div>
      {showBackButton && (
        <Button variant="outline" onClick={() => navigate(backPath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backButtonText}
        </Button>
      )}
    </div>
  )
}
