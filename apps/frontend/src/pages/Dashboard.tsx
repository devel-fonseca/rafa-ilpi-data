import { useState } from 'react'
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
import { CaregiverDashboard } from '@/pages/dashboards/CaregiverDashboard'
import { AdminDashboard } from '@/pages/dashboards/AdminDashboard'
import { ResidentQuickSearch } from '@/components/caregiver/ResidentQuickSearch'
import { ResidentQuickViewModal } from '@/components/caregiver/ResidentQuickViewModal'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null)

  // Detectar cargo e renderizar dashboard específico
  if (user?.profile?.positionCode === 'CAREGIVER') {
    return <CaregiverDashboard />
  }

  if (user?.profile?.positionCode === 'ADMINISTRATOR') {
    return <AdminDashboard />
  }

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
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      valueColor: 'text-blue-600',
    },
    {
      title: 'Funcionários',
      value: '1',
      description: 'Usuários ativos',
      icon: UserPlus,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      valueColor: 'text-green-600',
    },
    {
      title: 'Registros Hoje',
      value: String(totalRecordsToday),
      description: 'Atividades registradas',
      icon: Activity,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      valueColor: 'text-purple-600',
    },
    {
      title: 'Prescrições',
      value: String(totalPrescriptions),
      description: 'Prescrições ativas',
      icon: Pill,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100',
      valueColor: 'text-orange-600',
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

      {/* Busca Rápida de Residentes */}
      <ResidentQuickSearch
        onSelectResident={(residentId) => setSelectedResidentId(residentId)}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
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

      {/* Mini Prontuário Modal */}
      {selectedResidentId && (
        <ResidentQuickViewModal
          residentId={selectedResidentId}
          onClose={() => setSelectedResidentId(null)}
        />
      )}
    </div>
  )
}