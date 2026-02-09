import * as React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { Page } from './Page'
import { PageHeader, type PageHeaderProps } from './PageHeader'
import { Section } from './Section'

interface FiltersConfig {
  title?: string
  description?: string
  content: React.ReactNode
  defaultOpen?: boolean
}

interface ListConfig {
  title: string
  description?: string
  headerAction?: React.ReactNode
  content: React.ReactNode
}

export interface EntityListPageProps {
  pageHeader: Pick<PageHeaderProps, 'title' | 'subtitle' | 'actions' | 'badge' | 'breadcrumbs' | 'backButton'>
  filters: FiltersConfig
  list: ListConfig
}

/**
 * Template para páginas administrativas de listagem.
 *
 * Padrão aplicado:
 * - Header da página (PageHeader)
 * - Card de filtros colapsável
 * - Card de listagem com header destacado
 */
export function EntityListPage({ pageHeader, filters, list }: EntityListPageProps) {
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(filters.defaultOpen ?? false)

  return (
    <Page>
      <PageHeader
        title={pageHeader.title}
        subtitle={pageHeader.subtitle}
        actions={pageHeader.actions}
        badge={pageHeader.badge}
        breadcrumbs={pageHeader.breadcrumbs}
        backButton={pageHeader.backButton}
      />

      <Section
        title={filters.title ?? 'Filtros'}
        description={filters.description}
        className="overflow-hidden [&>div:first-child]:bg-primary/5"
        headerAction={(
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsFiltersOpen((prev) => !prev)}
            aria-label={isFiltersOpen ? 'Recolher filtros' : 'Expandir filtros'}
          >
            {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      >
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <CollapsibleContent>{filters.content}</CollapsibleContent>
        </Collapsible>
      </Section>

      <Section
        title={list.title}
        description={list.description}
        headerAction={list.headerAction}
        className="overflow-hidden [&>div:first-child]:bg-primary/5"
      >
        {list.content}
      </Section>
    </Page>
  )
}
