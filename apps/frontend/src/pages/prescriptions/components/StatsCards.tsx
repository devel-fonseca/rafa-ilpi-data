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
      suffix: 'ativas',
      footer: stats.totalActive > 0 ? 'Em acompanhamento terapêutico' : 'Nenhuma prescrição ativa',
      icon: FileText,
      bgColor: 'bg-primary/10',
      iconColor: 'text-primary',
      valueColor: 'text-primary',
      onClick: () => navigate('/dashboard/prescricoes/list?status=ATIVA'),
    },
    {
      title: 'Vencendo em 5 dias',
      value: stats.expiringIn5Days,
      suffix: stats.expiringIn5Days === 1 ? 'prescrição' : 'prescrições',
      footer: stats.expiringIn5Days > 0 ? 'Requerem revisão prioritária' : 'Nenhuma próxima do vencimento',
      icon: AlertTriangle,
      bgColor: 'bg-severity-warning/10',
      iconColor: 'text-severity-warning',
      valueColor: 'text-severity-warning',
      onClick: () => navigate('/dashboard/prescricoes/list?status=VENCENDO'),
    },
    {
      title: 'Antibióticos Ativos',
      value: stats.activeAntibiotics,
      suffix: 'ativos',
      footer: stats.activeAntibiotics > 0 ? 'Uso sob monitoramento clínico' : 'Sem antibióticos ativos',
      icon: Pill,
      bgColor: 'bg-success/10',
      iconColor: 'text-success',
      valueColor: 'text-success',
      onClick: () => navigate('/dashboard/prescricoes/list?type=ANTIBIOTICO'),
    },
    {
      title: 'Controlados Ativos',
      value: stats.activeControlled,
      suffix: 'ativos',
      footer: stats.activeControlled > 0 ? 'Exigem controle especial' : 'Sem controlados ativos',
      icon: Shield,
      bgColor: 'bg-medication-controlled/10',
      iconColor: 'text-medication-controlled',
      valueColor: 'text-medication-controlled',
      onClick: () => navigate('/dashboard/prescricoes/list?type=CONTROLADO'),
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={card.onClick}
        >
          <CardContent className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {card.title}
              </h3>
              <div
                className={`flex items-center justify-center w-10 h-10 ${card.bgColor} rounded-lg shrink-0`}
              >
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className={`text-3xl sm:text-4xl font-bold leading-none ${card.valueColor}`}>
                {card.value}
              </p>
              <span className="text-sm font-medium ml-1 text-muted-foreground">
                {card.suffix}
              </span>
            </div>
            <div className="mt-auto pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {card.footer}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
