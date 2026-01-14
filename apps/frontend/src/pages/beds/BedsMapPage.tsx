import { useBedsHierarchy } from '@/hooks/useBedsMap'
import { OccupancyStats } from '@/components/beds/OccupancyStats'
import { BedsMapVisualization } from '@/components/beds/BedsMapVisualization'
import { Loader2, AlertCircle, Bed } from 'lucide-react'
import { Page, PageHeader, Section, EmptyState } from '@/design-system/components'

export function BedsMapPage() {
  const { data, isLoading, error } = useBedsHierarchy()

  if (isLoading) {
    return (
      <Page>
        <PageHeader
          title="Mapa de Ocupação"
          subtitle="Carregando informações..."
        />
        <EmptyState
          icon={Loader2}
          title="Carregando mapa de ocupação..."
          description="Aguarde enquanto buscamos a estrutura de leitos"
          variant="loading"
        />
      </Page>
    )
  }

  if (error) {
    return (
      <Page>
        <PageHeader
          title="Mapa de Ocupação"
          subtitle="Erro ao carregar dados"
        />
        <EmptyState
          icon={AlertCircle}
          title="Erro ao carregar o mapa de ocupação"
          description="Ocorreu um erro ao buscar a estrutura de leitos. Tente novamente mais tarde."
          variant="error"
        />
      </Page>
    )
  }

  if (!data) {
    return (
      <Page>
        <PageHeader
          title="Mapa de Ocupação"
          subtitle="Sem dados disponíveis"
        />
        <EmptyState
          icon={Bed}
          title="Nenhum dado disponível"
          description="Não há informações de leitos cadastradas no momento"
        />
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        title="Mapa de Ocupação"
        subtitle="Visualização hierárquica completa da estrutura de leitos"
      />

      <Section title="Estatísticas de Ocupação">
        <OccupancyStats stats={data.stats} />
      </Section>

      <Section title="Mapa Hierárquico">
        <BedsMapVisualization data={data} />
      </Section>
    </Page>
  )
}
