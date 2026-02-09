import * as React from 'react'
import { cn } from '@/lib/utils'
import { Page } from './Page'
import { PageHeader, type PageHeaderProps } from './PageHeader'

export interface ResidentWorkspacePageProps {
  pageHeader: Pick<PageHeaderProps, 'title' | 'subtitle' | 'actions' | 'badge' | 'breadcrumbs' | 'backButton'>
  sidebar: React.ReactNode
  content: React.ReactNode
  className?: string
  gridClassName?: string
  maxWidth?: 'default' | '2xl' | 'full'
}

/**
 * Template para páginas do domínio do residente.
 *
 * Padrão aplicado:
 * - Header da página
 * - Layout split-view com sidebar + conteúdo principal
 */
export function ResidentWorkspacePage({
  pageHeader,
  sidebar,
  content,
  className,
  gridClassName,
  maxWidth = 'full',
}: ResidentWorkspacePageProps) {
  return (
    <Page maxWidth={maxWidth} className={className}>
      <PageHeader
        title={pageHeader.title}
        subtitle={pageHeader.subtitle}
        actions={pageHeader.actions}
        badge={pageHeader.badge}
        breadcrumbs={pageHeader.breadcrumbs}
        backButton={pageHeader.backButton}
      />

      <div className={cn('grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 lg:items-start', gridClassName)}>
        {sidebar}
        {content}
      </div>
    </Page>
  )
}

