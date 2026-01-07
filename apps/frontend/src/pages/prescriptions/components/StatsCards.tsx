import { useNavigate } from 'react-router-dom'
import { FileText, AlertTriangle, Pill, Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { DashboardStats } from '@/api/prescriptions.api'

interface StatsCardsProps {
  stats?: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const navigate = useNavigate()

  if (!stats) {
    return null
  }

  const cards = [
    {
      title: 'Prescrições Ativas',
      value: stats.totalActive,
      icon: FileText,
      bgColor: 'bg-primary/10',
      iconColor: 'text-primary',
      valueColor: 'text-primary',
      onClick: () => navigate('/dashboard/prescricoes/list?status=ATIVA'),
    },
    {
      title: 'Vencendo em 5 dias',
      value: stats.expiringIn5Days,
      icon: AlertTriangle,
      bgColor: 'bg-severity-warning/10',
      iconColor: 'text-severity-warning',
      valueColor: 'text-severity-warning',
      onClick: () => navigate('/dashboard/prescricoes/list?status=VENCENDO'),
    },
    {
      title: 'Antibióticos Ativos',
      value: stats.activeAntibiotics,
      icon: Pill,
      bgColor: 'bg-success/10',
      iconColor: 'text-success',
      valueColor: 'text-success',
      onClick: () => navigate('/dashboard/prescricoes/list?type=ANTIBIOTICO'),
    },
    {
      title: 'Controlados Ativos',
      value: stats.activeControlled,
      icon: Shield,
      bgColor: 'bg-medication-controlled/10',
      iconColor: 'text-medication-controlled',
      valueColor: 'text-medication-controlled',
      onClick: () => navigate('/dashboard/prescricoes/list?type=CONTROLADO'),
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={card.onClick}
        >
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </h3>
                <p className={`text-2xl font-bold ${card.valueColor} mt-1`}>
                  {card.value}
                </p>
              </div>
              <div
                className={`flex items-center justify-center w-12 h-12 ${card.bgColor} rounded-lg`}
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
