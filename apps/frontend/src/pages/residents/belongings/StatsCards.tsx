/* eslint-disable no-restricted-syntax */
import { Package, ShieldCheck, AlertTriangle, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BelongingStatus, type BelongingStats } from '@/types/belongings'

interface StatsCardsProps {
  stats?: BelongingStats
  isLoading?: boolean
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const emGuarda = stats?.byStatus.find((s) => s.status === BelongingStatus.EM_GUARDA)?.count || 0
  const devolvidos = stats?.byStatus.find((s) => s.status === BelongingStatus.DEVOLVIDO)?.count || 0
  const extraviados = stats?.byStatus.find((s) => s.status === BelongingStatus.EXTRAVIADO)?.count || 0

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totals.totalItems || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.totals.totalQuantity || 0} unidades no total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Guarda</CardTitle>
          <ShieldCheck className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{emGuarda}</div>
          <p className="text-xs text-muted-foreground">
            {devolvidos} devolvido(s)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Extraviados</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{extraviados}</div>
          <p className="text-xs text-muted-foreground">
            Itens não localizados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Declarado</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(stats?.totals.totalDeclaredValue || 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            Soma dos valores declarados
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
