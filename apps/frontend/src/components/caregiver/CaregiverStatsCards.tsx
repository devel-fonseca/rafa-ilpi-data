import { Card, CardContent } from '@/components/ui/card'
import { ClipboardList, Activity, Pill } from 'lucide-react'
import type { CaregiverTasksStats } from '@/hooks/useCaregiverTasks'

interface Props {
  stats?: CaregiverTasksStats
  isLoading?: boolean
}

export function CaregiverStatsCards({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Total Pendente',
      value: stats?.totalPending || 0,
      description: 'Tarefas a realizar',
      icon: ClipboardList,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
      valueColor: 'text-primary',
    },
    {
      title: 'Registros Obrigatórios',
      value: stats?.recordsPending || 0,
      description: 'Pendentes de registro',
      icon: Activity,
      iconColor: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-600/10 dark:bg-orange-400/10',
      valueColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      title: 'Medicações Agendadas',
      value: stats?.medicationsCount || 0,
      description: 'Horários programados',
      icon: Pill,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-600/10 dark:bg-purple-400/10',
      valueColor: 'text-purple-600 dark:text-purple-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {cards.map((card) => (
        <Card key={card.title} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </h3>
                <p className={`text-3xl font-bold ${card.valueColor} mt-2`}>
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </div>
              <div
                className={`flex items-center justify-center w-12 h-12 ${card.iconBg} rounded-lg`}
              >
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
