import { useAuthStore } from '@/stores/auth.store'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Calendar, Activity, UserPlus, Pill } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useResidentStats } from '@/hooks/useResidents'
import { useDailyRecordsByDate } from '@/hooks/useDailyRecords'
import { usersApi } from '@/api/users.api'
import { format } from 'date-fns'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PendingActivities } from '@/components/dashboard/PendingActivities'
import { CaregiverDashboard } from '@/pages/dashboards/CaregiverDashboard'
import { AdminDashboard } from '@/pages/dashboards/AdminDashboard'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { Page, PageHeader, Section, QuickActionsGrid } from '@/design-system/components'
import { tenantKey } from '@/lib/query-keys'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Buscar estatísticas reais (hooks devem ser chamados antes de early returns)
  const { data: residentsStats } = useResidentStats()

  const { data: prescriptionsStats } = useQuery({
    queryKey: tenantKey('prescriptions', 'stats', 'dashboard'),
    queryFn: async () => {
      const response = await api.get('/prescriptions/stats/dashboard')
      return response.data
    },
  })

  const { data: usersCount } = useQuery({
    queryKey: tenantKey('users', 'stats', 'count'),
    queryFn: () => usersApi.countActiveUsers(),
  })

  // Buscar registros de hoje
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: recordsToday = [] } = useDailyRecordsByDate(today)

  // Detectar cargo e renderizar dashboard específico
  if (user?.profile?.positionCode === 'CAREGIVER') {
    return <CaregiverDashboard />
  }

  if (user?.profile?.positionCode === 'ADMINISTRATOR') {
    return <AdminDashboard />
  }

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
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
      valueColor: 'text-primary',
    },
    {
      title: 'Usuários',
      value: String(usersCount || 0),
      description: 'Usuários ativos',
      icon: UserPlus,
      iconColor: 'text-success',
      iconBg: 'bg-success/10',
      valueColor: 'text-success',
    },
    {
      title: 'Registros Hoje',
      value: String(totalRecordsToday),
      description: 'Atividades registradas',
      icon: Activity,
      iconColor: 'text-medication-controlled',
      iconBg: 'bg-medication-controlled/10',
      valueColor: 'text-medication-controlled',
    },
    {
      title: 'Prescrições',
      value: String(totalPrescriptions),
      description: 'Prescrições ativas',
      icon: Pill,
      iconColor: 'text-severity-warning',
      iconBg: 'bg-severity-warning/10',
      valueColor: 'text-severity-warning',
    },
  ]

  // Ações rápidas (ordenadas por frequência de uso)
  const quickActions = [
    {
      title: 'Agenda de Hoje',
      description: 'Ver medicamentos e agendamentos',
      icon: Calendar,
      onClick: () => navigate('/dashboard/agenda'),
      disabled: false,
    },
    {
      title: 'Registros Diários',
      description: 'Registrar atividades do dia',
      icon: Activity,
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
      title: 'Adicionar Residente',
      description: 'Cadastrar novo residente',
      icon: UserPlus,
      onClick: () => navigate('/dashboard/residentes/new'),
      disabled: false,
    },
  ]

  return (
    <Page>
      <PageHeader
        title={`Bem-vindo de volta, ${user?.name?.split(' ')[0]}!`}
        subtitle="Aqui está um resumo das atividades de hoje"
      />

      {/* Busca Universal */}
      <UniversalSearch />

      {/* Stats Grid */}
      <Section title="Estatísticas">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                    <p className={`text-2xl font-bold ${stat.valueColor} mt-1`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`flex items-center justify-center w-12 h-12 ${stat.iconBg} rounded-lg`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Quick Actions */}
      <Section title="Ações Rápidas">
        <QuickActionsGrid actions={quickActions} columns={4} />
      </Section>

      {/* Activities Grid - Recent & Pending */}
      <Section title="Atividades Recentes">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <RecentActivity />

          {/* Pending Activities */}
          <PendingActivities />
        </div>
      </Section>
    </Page>
  )
}