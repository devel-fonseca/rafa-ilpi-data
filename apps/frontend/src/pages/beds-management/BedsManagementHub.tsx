import { useState, useMemo } from 'react'
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
} from 'lucide-react'
import { ReserveBedModal, BlockBedModal, ReleaseBedModal } from './modals'
import { SelectBedForActionModal } from '@/components/beds/SelectBedForActionModal'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Bed as BedType, BedStatusHistoryEntry } from '@/api/beds.api'

type ActionType = 'reserve' | 'block' | 'release'

interface BedWithHierarchy {
  id: string
  code: string
  bedNumber: string
  status: string
  roomId: string
  residentId?: string
  resident?: {
    id: string
    fullName: string
    fotoUrl?: string
  }
  occupiedSince?: string
  observations?: string
  createdAt: string
  updatedAt: string
  room: {
    id: string
    name: string
    roomType?: string
  }
  floor: {
    id: string
    name: string
  }
  building: {
    id: string
    name: string
  }
}

export default function BedsManagementHub() {
  const { data: beds, isLoading: bedsLoading } = useBeds() // ✅ Busca todos os leitos
  const { data: historyData, isLoading: historyLoading } = useBedStatusHistory({ take: 10 })

  const [selectedBed, setSelectedBed] = useState<BedType | null>(null)
  const [selectBedModalOpen, setSelectBedModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null)
  const [reserveModalOpen, setReserveModalOpen] = useState(false)
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [releaseModalOpen, setReleaseModalOpen] = useState(false)

  // Leitos já vêm com hierarquia completa (room -> floor -> building)
  const bedsWithHierarchy = useMemo(() => {
    if (!beds) return []

    return beds.map((bed) => ({
      ...bed,
      room: {
        id: bed.room?.id || '',
        name: bed.room?.name || 'Sem quarto',
        roomType: bed.room?.roomType,
      },
      floor: {
        id: bed.room?.floor?.id || '',
        name: bed.room?.floor?.name || 'Sem andar',
      },
      building: {
        id: bed.room?.floor?.building?.id || '',
        name: bed.room?.floor?.building?.name || 'Sem prédio',
      },
    }))
  }, [beds])

  const isLoading = bedsLoading || historyLoading

  // Calculate statistics
  const stats = {
    total: beds?.length || 0,
    occupied: beds?.filter((b: BedType) => b.status === 'Ocupado').length || 0,
    available: beds?.filter((b: BedType) => b.status === 'Disponível').length || 0,
    maintenance: beds?.filter((b: BedType) => b.status === 'Manutenção').length || 0,
    reserved: beds?.filter((b: BedType) => b.status === 'Reservado').length || 0,
  }

  const occupancyRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0

  // Handlers para abrir seletor de leito
  const handleOpenReserveAction = () => {
    setPendingAction('reserve')
    setSelectBedModalOpen(true)
  }

  const handleOpenBlockAction = () => {
    setPendingAction('block')
    setSelectBedModalOpen(true)
  }

  const handleOpenReleaseAction = () => {
    setPendingAction('release')
    setSelectBedModalOpen(true)
  }

  // Handler para quando um leito é selecionado
  const handleBedSelected = (bed: BedWithHierarchy) => {
    // Encontrar o leito original na lista para ter a estrutura completa
    const originalBed = beds?.find(b => b.id === bed.id)
    if (originalBed) {
      setSelectedBed(originalBed)
    }
    setSelectBedModalOpen(false)

    // Abrir modal apropriado baseado na ação pendente
    if (pendingAction === 'reserve') {
      setReserveModalOpen(true)
    } else if (pendingAction === 'block') {
      setBlockModalOpen(true)
    } else if (pendingAction === 'release') {
      setReleaseModalOpen(true)
    }

    setPendingAction(null)
  }

  // Handler para rolar para o histórico
  const handleViewHistory = () => {
    const historySection = document.getElementById('movimentacoes-recentes')
    historySection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Filtros de status para cada ação
  const getSelectModalConfig = () => {
    if (pendingAction === 'reserve') {
      return {
        title: 'Selecionar Leito para Reservar',
        description: 'Escolha um leito disponível para reservar',
        allowedStatuses: ['Disponível'],
      }
    } else if (pendingAction === 'block') {
      return {
        title: 'Selecionar Leito para Bloquear',
        description: 'Escolha um leito para colocar em manutenção',
        allowedStatuses: undefined, // Qualquer status pode ser bloqueado
      }
    } else if (pendingAction === 'release') {
      return {
        title: 'Selecionar Leito para Liberar',
        description: 'Escolha um leito bloqueado ou reservado para liberar',
        allowedStatuses: ['Manutenção', 'Reservado'],
      }
    }
    return {
      title: 'Selecionar Leito',
      description: 'Escolha um leito',
      allowedStatuses: undefined,
    }
  }

  const selectModalConfig = getSelectModalConfig()

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
          variant="secondary"
        />
      </div>

      {/* Ações Rápidas */}
      <Section title="Ações Rápidas">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Transferir Residente */}
          <Button
            asChild
            variant="outline"
            className="h-auto flex-col gap-2 p-4 hover:bg-primary/5 hover:border-primary/50 transition-all"
          >
            <Link to="/beds/map">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-sm">Transferir Residente</div>
                <div className="text-xs text-muted-foreground mt-0.5">Mover entre leitos</div>
              </div>
            </Link>
          </Button>

          {/* Reservar Leito */}
          <Button
            variant="outline"
            disabled={stats.available === 0}
            onClick={handleOpenReserveAction}
            className="h-auto flex-col gap-2 p-4 hover:bg-secondary/5 hover:border-secondary/50 transition-all"
          >
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Calendar className="w-5 h-5 text-secondary" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-sm">Reservar Leito</div>
              <div className="text-xs text-muted-foreground mt-0.5">Reserva futura</div>
            </div>
          </Button>

          {/* Bloquear Leito */}
          <Button
            variant="outline"
            onClick={handleOpenBlockAction}
            className="h-auto flex-col gap-2 p-4 hover:bg-warning/5 hover:border-warning/50 transition-all"
          >
            <div className="p-2 bg-warning/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-sm">Bloquear Leito</div>
              <div className="text-xs text-muted-foreground mt-0.5">Para manutenção</div>
            </div>
          </Button>

          {/* Liberar Leito */}
          <Button
            variant="outline"
            disabled={stats.maintenance === 0 && stats.reserved === 0}
            onClick={handleOpenReleaseAction}
            className="h-auto flex-col gap-2 p-4 hover:bg-success/5 hover:border-success/50 transition-all"
          >
            <div className="p-2 bg-success/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-sm">Liberar Leito</div>
              <div className="text-xs text-muted-foreground mt-0.5">Disponibilizar</div>
            </div>
          </Button>

          {/* Histórico de Movimentações */}
          <Button
            variant="outline"
            onClick={handleViewHistory}
            className="h-auto flex-col gap-2 p-4 hover:bg-accent transition-all"
          >
            <div className="p-2 bg-muted rounded-lg">
              <History className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-sm">Ver Histórico</div>
              <div className="text-xs text-muted-foreground mt-0.5">Todas mudanças</div>
            </div>
          </Button>
        </div>
      </Section>

      {/* Visualizações */}
      <Section title="Visualizações">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Map className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-semibold text-lg">Mapa de Ocupação</h3>
                <p className="text-sm text-muted-foreground">
                  Visualização hierárquica em tempo real da ocupação
                </p>
              </div>
            </div>
            <Button asChild variant="default" className="w-full">
              <Link to="/dashboard/beds/map">
                <Map className="mr-2 h-4 w-4" />
                Abrir Mapa Interativo
              </Link>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Building2 className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-semibold text-lg">Estrutura de Leitos</h3>
                <p className="text-sm text-muted-foreground">
                  CRUD completo de prédios, andares, quartos e leitos
                </p>
              </div>
            </div>
            <Button asChild variant="default" className="w-full">
              <Link to="/dashboard/beds/structure">
                <Building2 className="mr-2 h-4 w-4" />
                Gerenciar Estrutura
              </Link>
            </Button>
          </Card>
        </div>
      </Section>

      {/* Movimentações Recentes */}
      <Section title="Movimentações Recentes" id="movimentacoes-recentes">
        <Card className="p-6">
          {historyData && historyData.data && historyData.data.length > 0 ? (
            <div className="space-y-2">
              {historyData.data.map((entry: BedStatusHistoryEntry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  {/* Código do Leito */}
                  <div className="flex-shrink-0">
                    <span className="text-xs font-mono font-semibold bg-muted px-2 py-1 rounded">
                      {entry.bed.code}
                    </span>
                  </div>

                  {/* Seta */}
                  <span className="text-muted-foreground text-sm">→</span>

                  {/* Status (De → Para) */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        entry.previousStatus === 'Disponível'
                          ? 'bg-success/10 text-success'
                          : entry.previousStatus === 'Ocupado'
                            ? 'bg-danger/10 text-danger'
                            : entry.previousStatus === 'Manutenção'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {entry.previousStatus}
                    </span>
                    <span className="text-xs">→</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        entry.newStatus === 'Disponível'
                          ? 'bg-success/10 text-success'
                          : entry.newStatus === 'Ocupado'
                            ? 'bg-danger/10 text-danger'
                            : entry.newStatus === 'Manutenção'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {entry.newStatus}
                    </span>
                  </div>

                  {/* Motivo */}
                  {entry.reason && (
                    <p className="text-xs text-muted-foreground flex-1 truncate" title={entry.reason}>
                      {entry.reason}
                    </p>
                  )}

                  {/* Data/Hora */}
                  <div className="text-xs text-muted-foreground flex-shrink-0 text-right ml-auto">
                    {format(new Date(entry.changedAt), "dd 'de' MMM 'às' HH:mm", {
                      locale: ptBR,
                    })}
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
      {/* Modal Seletor de Leito */}
      <SelectBedForActionModal
        open={selectBedModalOpen}
        onOpenChange={setSelectBedModalOpen}
        beds={bedsWithHierarchy}
        allowedStatuses={selectModalConfig.allowedStatuses}
        title={selectModalConfig.title}
        description={selectModalConfig.description}
        onSelectBed={handleBedSelected}
      />

      {/* Modais de Ação */}
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
