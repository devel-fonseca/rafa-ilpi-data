import * as React from 'react'
import { Page } from './Page'
import { PageHeader, type PageHeaderProps } from './PageHeader'
import { Section } from './Section'

interface FiltersConfig {
  title?: string
  content: React.ReactNode
}

interface ListConfig {
  title: string
  description?: string
  headerAction?: React.ReactNode
  content: React.ReactNode
}

export interface EntityListPageProps {
  pageHeader: Pick<PageHeaderProps, 'title' | 'subtitle' | 'actions' | 'badge' | 'breadcrumbs' | 'backButton'>
  filters?: FiltersConfig
  list: ListConfig
}

/**
 * Template para páginas administrativas de listagem.
 *
 * Padrão aplicado:
 * - Header da página (PageHeader)
 * - Card de filtros (sempre visível)
 * - Card de listagem com header destacado
 */
export function EntityListPage({ pageHeader, filters, list }: EntityListPageProps) {
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

      {filters && (
        <Section title={filters.title ?? 'Filtros'}>
          {filters.content}
        </Section>
      )}

      <Section
        title={list.title}
        description={list.description}
        headerAction={list.headerAction}
      >
        {list.content}
      </Section>
    </Page>
  )
}
