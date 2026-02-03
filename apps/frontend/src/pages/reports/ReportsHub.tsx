import { useNavigate } from 'react-router-dom'
import { Page, PageHeader, Section } from '@/design-system/components'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Calendar, TrendingUp, Users } from 'lucide-react'

interface ReportCard {
  id: string
  title: string
  description: string
  icon: React.ElementType
  route: string
  badge?: string
  iconColor: string
}

export default function ReportsHub() {
  const navigate = useNavigate()

  const reports: ReportCard[] = [
    {
      id: 'daily',
      title: 'Relatório Diário',
      description: 'Visualize todos os registros, medicações e sinais vitais de um dia específico',
      icon: Calendar,
      route: '/dashboard/relatorios/diario',
      iconColor: 'text-primary',
    },
    {
      id: 'monthly',
      title: 'Relatório Mensal',
      description: 'Resumo consolidado de um mês com estatísticas e indicadores',
      icon: TrendingUp,
      route: '/dashboard/relatorios/mensal',
      badge: 'Em Breve',
      iconColor: 'text-warning',
    },
    {
      id: 'residents',
      title: 'Relatório por Residente',
      description: 'Histórico completo e detalhado de um residente específico',
      icon: Users,
      route: '/dashboard/relatorios/residente',
      badge: 'Em Breve',
      iconColor: 'text-success',
    },
    {
      id: 'custom',
      title: 'Relatório Personalizado',
      description: 'Crie relatórios customizados com filtros e períodos específicos',
      icon: FileText,
      route: '/dashboard/relatorios/personalizado',
      badge: 'Em Breve',
      iconColor: 'text-info',
    },
  ]

  return (
    <Page>
      <PageHeader
        title="Relatórios"
        subtitle="Gere e visualize relatórios detalhados da instituição"
      />

      <Section title="Tipos de Relatórios">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => {
            const Icon = report.icon
            const isAvailable = !report.badge

            return (
              <Card
                key={report.id}
                className={cn(
                  'transition-all duration-200 border-2',
                  isAvailable
                    ? 'hover:shadow-lg hover:border-primary cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                )}
                onClick={() => isAvailable && navigate(report.route)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-3 rounded-lg bg-muted', report.iconColor)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        {report.badge && (
                          <span className="inline-block px-2 py-0.5 mt-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                            {report.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {report.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </Section>

      <Section title="Informações">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">💡 Dica:</strong> Todos os relatórios podem ser exportados em PDF para impressão ou arquivamento.
              </p>
              <p>
                <strong className="text-foreground">📊 Dados:</strong> Os relatórios são gerados em tempo real com base nos registros do sistema.
              </p>
              <p>
                <strong className="text-foreground">🔒 Segurança:</strong> Apenas usuários autorizados podem visualizar relatórios.
              </p>
            </div>
          </CardContent>
        </Card>
      </Section>
    </Page>
  )
}

// Helper function for className
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
