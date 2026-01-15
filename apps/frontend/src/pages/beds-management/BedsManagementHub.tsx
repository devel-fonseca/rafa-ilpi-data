import { useState } from 'react'
import { Page, PageHeader, Section, StatCard } from '@/design-system/components'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBeds } from '@/hooks/useBeds'
import { useBedStatusHistory } from '@/hooks/useBedOperations'
import {
  Bed,
  Building2,
  GitBranch,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ArrowRightLeft,
  History,
  Map,
  List,
} from 'lucide-react'
import { ReserveBedModal, BlockBedModal, ReleaseBedModal } from './modals'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function BedsManagementHub() {
  const { beds, isLoading: bedsLoading } = useBeds({ page: 1, limit: 1000 })
  const { data: historyData, isLoading: historyLoading } = useBedStatusHistory({ take: 10 })

  const [selectedBed, setSelectedBed] = useState<any>(null)
  const [reserveModalOpen, setReserveModalOpen] = useState(false)
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [releaseModalOpen, setReleaseModalOpen] = useState(false)

  const isLoading = bedsLoading || historyLoading

  // Calculate statistics
  const stats = {
    total: beds?.length || 0,
    occupied: beds?.filter((b: any) => b.status === 'Ocupado').length || 0,
    available: beds?.filter((b: any) => b.status === 'Disponível').length || 0,
    maintenance: beds?.filter((b: any) => b.status === 'Manutenção').length || 0,
    reserved: beds?.filter((b: any) => b.status === 'Reservado').length || 0,
  }

  const occupancyRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0

  if (isLoading) {
    return (
      <Page>
        <PageHeader
          title="Gestão de Leitos"
          subtitle="Central de operações de leitos"
          icon={<GitBranch className="w-8 h-8" />}
        />
        <div className="flex justify-center items-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        title="Gestão de Leitos"
        subtitle="Central de operações para gestão de leitos: transferências, reservas, bloqueios e liberações"
        icon={<GitBranch className="w-8 h-8" />}
      />

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <StatCard
          title="Total de Leitos"
          value={stats.total}
          icon={Bed}
          variant="primary"
        />

        <StatCard
          title="Ocupados"
          value={stats.occupied}
          icon={Bed}
          variant="info"
          description={`${occupancyRate}% de ocupação`}
        />

        <StatCard
          title="Disponíveis"
          value={stats.available}
          icon={CheckCircle}
          variant="success"
        />

        <StatCard
          title="Manutenção"
          value={stats.maintenance}
          icon={AlertTriangle}
          variant="warning"
        />

        <StatCard
          title="Reservados"
          value={stats.reserved}
          icon={Calendar}
          variant="default"
        />
      </div>

      {/* Ações Rápidas */}
      <Section title="Ações Rápidas">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Transferir Residente */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <ArrowRightLeft className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Transferir Residente</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Mover residente entre leitos usando o mapa interativo
                </p>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/beds/map">
                    <Map className="mr-2 h-4 w-4" />
                    Ir para Mapa de Ocupação
                  </Link>
                </Button>
              </div>
            </div>
          </Card>

          {/* Reservar Leito */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Reservar Leito</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Reservar leito disponível para futuro residente
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={stats.available === 0}
                  onClick={() => setReserveModalOpen(true)}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Reservar Leito
                </Button>
              </div>
            </div>
          </Card>

          {/* Bloquear Leito */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Bloquear para Manutenção</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Bloquear leito impedindo nova ocupação
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setBlockModalOpen(true)}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Bloquear Leito
                </Button>
              </div>
            </div>
          </Card>

          {/* Liberar Leito */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Liberar Leito</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Liberar leito bloqueado ou reservado
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={stats.maintenance === 0 && stats.reserved === 0}
                  onClick={() => setReleaseModalOpen(true)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Liberar Leito
                </Button>
              </div>
            </div>
          </Card>

          {/* Histórico de Movimentações */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <History className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Histórico Completo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Visualizar todas as mudanças de status
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <History className="mr-2 h-4 w-4" />
                  Ver Histórico
                </Button>
              </div>
            </div>
          </Card>

          {/* Estrutura de Leitos */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Estrutura de Leitos</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Gerenciar prédios, andares, quartos e leitos
                </p>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/beds/structure">
                    <List className="mr-2 h-4 w-4" />
                    Acessar Estrutura
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* Links Rápidos */}
      <Section title="Visualizações">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Map className="w-8 h-8 text-blue-500" />
              <div>
                <h3 className="font-semibold text-lg">Mapa de Ocupação</h3>
                <p className="text-sm text-muted-foreground">
                  Visualização hierárquica em tempo real da ocupação
                </p>
              </div>
            </div>
            <Button asChild variant="default" className="w-full">
              <Link to="/beds/map">
                <Map className="mr-2 h-4 w-4" />
                Abrir Mapa Interativo
              </Link>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Building2 className="w-8 h-8 text-indigo-500" />
              <div>
                <h3 className="font-semibold text-lg">Estrutura de Leitos</h3>
                <p className="text-sm text-muted-foreground">
                  CRUD completo de prédios, andares, quartos e leitos
                </p>
              </div>
            </div>
            <Button asChild variant="default" className="w-full">
              <Link to="/beds/structure">
                <Building2 className="mr-2 h-4 w-4" />
                Gerenciar Estrutura
              </Link>
            </Button>
          </Card>
        </div>
      </Section>

      {/* Movimentações Recentes */}
      <Section title="Movimentações Recentes">
        <Card className="p-6">
          {historyData && historyData.data && historyData.data.length > 0 ? (
            <div className="space-y-3">
              {historyData.data.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {entry.bed.code}
                      </span>
                      <span className="text-muted-foreground">→</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            entry.previousStatus === 'Disponível'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : entry.previousStatus === 'Ocupado'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                : entry.previousStatus === 'Manutenção'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                          }`}
                        >
                          {entry.previousStatus}
                        </span>
                        <span>→</span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            entry.newStatus === 'Disponível'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : entry.newStatus === 'Ocupado'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                : entry.newStatus === 'Manutenção'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                          }`}
                        >
                          {entry.newStatus}
                        </span>
                      </div>
                      {entry.reason && (
                        <p className="text-sm text-muted-foreground mt-1">{entry.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>
                      {format(new Date(entry.changedAt), "dd 'de' MMMM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma movimentação registrada ainda</p>
            </div>
          )}
        </Card>
      </Section>

      {/* Modais */}
      <ReserveBedModal
        bed={selectedBed}
        open={reserveModalOpen}
        onOpenChange={setReserveModalOpen}
        onSuccess={() => {
          setSelectedBed(null)
          setReserveModalOpen(false)
        }}
      />

      <BlockBedModal
        bed={selectedBed}
        open={blockModalOpen}
        onOpenChange={setBlockModalOpen}
        onSuccess={() => {
          setSelectedBed(null)
          setBlockModalOpen(false)
        }}
      />

      <ReleaseBedModal
        bed={selectedBed}
        open={releaseModalOpen}
        onOpenChange={setReleaseModalOpen}
        onSuccess={() => {
          setSelectedBed(null)
          setReleaseModalOpen(false)
        }}
      />
    </Page>
  )
}
