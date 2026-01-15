import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Users, FileText, FolderOpen, Bed, Calendar } from 'lucide-react'

export function QuickActionGrid() {
  const navigate = useNavigate()

  const actions = [
    {
      icon: Plus,
      label: 'Novo Residente',
      description: 'Cadastrar novo residente',
      color: 'bg-primary/10 text-primary hover:bg-primary/20',
      onClick: () => navigate('/dashboard/residentes/new'),
    },
    {
      icon: Users,
      label: 'Lista Completa',
      description: 'Ver todos os residentes',
      color: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
      onClick: () => navigate('/dashboard/residentes'),
    },
    {
      icon: FileText,
      label: 'Relatórios',
      description: 'Gerar relatórios',
      color: 'bg-info/10 text-info hover:bg-info/20',
      onClick: () => {
        // TODO: Implementar página de relatórios
        alert('Página de relatórios em desenvolvimento')
      },
    },
    {
      icon: FolderOpen,
      label: 'Documentos',
      description: 'Gerenciar documentos',
      color: 'bg-warning/10 text-warning hover:bg-warning/20',
      onClick: () => {
        // TODO: Implementar página de documentos
        alert('Página de documentos em desenvolvimento')
      },
    },
    {
      icon: Bed,
      label: 'Acomodações',
      description: 'Gerenciar leitos',
      color: 'bg-success/10 text-success hover:bg-success/20',
      onClick: () => navigate('/dashboard/infrastructure/beds'),
    },
    {
      icon: Calendar,
      label: 'Agenda',
      description: 'Rotina de atividades',
      color: 'bg-medication-controlled/10 text-medication-controlled hover:bg-medication-controlled/20',
      onClick: () => {
        // TODO: Implementar página de agenda
        alert('Página de agenda em desenvolvimento')
      },
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {actions.map((action, index) => {
        const Icon = action.icon
        return (
          <Card
            key={index}
            className="cursor-pointer transition-all duration-200 hover:shadow-md active:scale-95"
            onClick={action.onClick}
          >
            <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-2">
              <div className={`p-2.5 sm:p-3 rounded-lg ${action.color}`}>
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 w-full">
                <p className="font-semibold text-xs truncate">{action.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{action.description}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
