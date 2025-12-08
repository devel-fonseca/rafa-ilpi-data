import { useAuthStore } from '@/stores/auth.store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Calendar, Activity, Settings, UserPlus, Pill } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useResidentStats } from '@/hooks/useResidents'
import { useDailyRecordsByDate } from '@/hooks/useDailyRecords'
import { format } from 'date-fns'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PendingActivities } from '@/components/dashboard/PendingActivities'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Buscar estatísticas reais
  const { data: residentsStats } = useResidentStats()

  const { data: prescriptionsStats } = useQuery({
    queryKey: ['prescriptions-stats'],
    queryFn: async () => {
      const response = await api.get('/prescriptions/stats/dashboard')
      return response.data
    },
  })

  // Buscar registros de hoje
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: recordsToday = [] } = useDailyRecordsByDate(today)

  const totalResidents = residentsStats?.total || 0
  const totalPrescriptions = prescriptionsStats?.totalActive || 0
  const totalRecordsToday = recordsToday.length

  // Cards de estatísticas
  const stats = [
    {
      title: 'Residentes',
      value: String(totalResidents),
      description: 'Total de residentes cadastrados',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Funcionários',
      value: '1',
      description: 'Usuários ativos',
      icon: UserPlus,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Registros Hoje',
      value: String(totalRecordsToday),
      description: 'Atividades registradas',
      icon: Activity,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Prescrições',
      value: String(totalPrescriptions),
      description: 'Prescrições ativas',
      icon: Pill,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ]

  // Ações rápidas
  const quickActions = [
    {
      title: 'Adicionar Residente',
      description: 'Cadastrar novo residente',
      icon: UserPlus,
      onClick: () => navigate('/dashboard/residentes/new'),
      disabled: false,
    },
    {
      title: 'Registros Diários',
      description: 'Registrar atividades do dia',
      icon: Calendar,
      onClick: () => navigate('/dashboard/registros-diarios'),
      disabled: false,
    },
    {
      title: 'Medicações',
      description: 'Gerenciar medicações',
      icon: Pill,
      onClick: () => navigate('/dashboard/prescricoes'),
      disabled: false,
    },
    {
      title: 'Configurações',
      description: 'Configurações da ILPI',
      icon: Settings,
      onClick: () => navigate('/dashboard/settings'),
      disabled: false,
    },
  ]

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Bem-vindo de volta, {user?.name?.split(' ')[0]}!
        </h2>
        <p className="text-muted-foreground mt-1">
          Aqui está um resumo das atividades de hoje
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription className="text-xs">{stat.title}</CardDescription>
                  <CardTitle className="text-3xl font-bold mt-1">
                    {stat.value}
                  </CardTitle>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Button
              key={action.title}
              variant="outline"
              className="h-auto p-4 justify-start hover:shadow-md transition-shadow"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              <div className="flex items-start gap-3 w-full">
                <action.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-left">
                  <p className="font-medium text-foreground">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                  {action.disabled && (
                    <span className="text-xs text-warning mt-1 inline-block">
                      Em breve
                    </span>
                  )}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Activities Grid - Recent & Pending */}
      <div className="mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Atividades Recentes</h3>
            <RecentActivity />
          </div>

          {/* Pending Activities */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Atividades Pendentes</h3>
            <PendingActivities />
          </div>
        </div>
      </div>

      {/* Plan Info */}
      {user?.tenant && (
        <div className="mt-8 p-4 bg-info/10 rounded-lg border border-info/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Plano Atual: <span className="font-bold">{'plan' in user.tenant ? (user.tenant as any).plan : 'Free'}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Status: <span className="font-medium">{user.tenant.status === 'ACTIVE' ? 'Ativo' : user.tenant.status}</span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-info/30 hover:bg-info/10"
              onClick={() => navigate('/dashboard/settings/billing')}
            >
              Gerenciar Plano
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}