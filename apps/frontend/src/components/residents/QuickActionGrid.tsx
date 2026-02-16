import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus, Users, FileText, Bed, Calendar } from 'lucide-react'

export function QuickActionGrid() {
  const navigate = useNavigate()

  const actions = [
    {
      icon: Plus,
      label: 'Novo Residente',
      description: 'Cadastrar novo residente',
      onClick: () => navigate('/dashboard/residentes/new'),
    },
    {
      icon: Users,
      label: 'Lista Completa',
      description: 'Ver todos os residentes',
      onClick: () => navigate('/dashboard/residentes'),
    },
    {
      icon: FileText,
      label: 'Relatórios',
      description: 'Gerar relatórios',
      onClick: () => navigate('/dashboard/relatorios'),
    },
    {
      icon: Bed,
      label: 'Mapa de Ocupação',
      description: 'Visualizar mapa de leitos',
      onClick: () => navigate('/dashboard/beds/map'),
    },
    {
      icon: Calendar,
      label: 'Agenda',
      description: 'Rotina de atividades',
      onClick: () => navigate('/dashboard/agenda'),
    },
  ]

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2 overflow-x-auto">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Tooltip key={action.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-md"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  aria-label={action.label}
                >
                  <Icon className="h-5 w-5 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                <p className="font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">
                  {action.disabled ? 'Em breve' : action.description}
                </p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
