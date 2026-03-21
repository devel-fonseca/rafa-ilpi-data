import { useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EChart, useEChartThemeTokens } from '@/components/ui/echart'
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Clock, TrendingUp } from 'lucide-react'
import type { FinancialTransaction, FinancialCategory } from '@/types/financial-operations'
import { formatDateOnly, formatMonthLabel, parseCurrencyValue, statusLabel } from '../financial.utils'

interface DashboardSectionProps {
  transactions: FinancialTransaction[]
  categories: FinancialCategory[]
  isLoading: boolean
  totalTransactions: number
  formatCurrency: (value: string | number) => string
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--danger))',
  'hsl(var(--info))',
  'hsl(210 50% 60%)',
  'hsl(280 50% 55%)',
  'hsl(30 70% 50%)',
]

const OPEN_STATUSES = new Set<FinancialTransaction['status']>(['PENDING', 'OVERDUE', 'PARTIALLY_PAID'])

const STATUS_BADGE_VARIANT: Record<
  FinancialTransaction['status'],
  'success' | 'warning' | 'danger' | 'secondary' | 'info'
> = {
  PAID: 'success',
  PENDING: 'warning',
  OVERDUE: 'danger',
  CANCELLED: 'secondary',
  REFUNDED: 'info',
  PARTIALLY_PAID: 'info',
}

const PERIOD_OPTIONS = [
  { value: '3m', label: '3 meses', months: 3 },
  { value: '6m', label: '6 meses', months: 6 },
  { value: 'all', label: 'Tudo', months: Number.POSITIVE_INFINITY },
] as const

type DashboardPeriod = (typeof PERIOD_OPTIONS)[number]['value']

const compactNumberFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

type CriticalAgendaItem = {
  id: string
  description: string
  type: FinancialTransaction['type']
  status: FinancialTransaction['status']
  dueDate: string
  amount: number
  priority: number
  dueDateValue: number
}

function parseDate(value: string): Date | null {
  const normalized = value.slice(0, 10)
  const date = new Date(`${normalized}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function DashboardSection({
  transactions,
  categories,
  isLoading,
  totalTransactions,
  formatCurrency,
}: DashboardSectionProps) {
  const [period, setPeriod] = useState<DashboardPeriod>('6m')
  const tokens = useEChartThemeTokens()

  const availableMonths = useMemo(() => {
    const months = new Set<string>()

    for (const transaction of transactions) {
      months.add(transaction.competenceMonth.slice(0, 7))
    }

    return Array.from(months).sort((a, b) => a.localeCompare(b))
  }, [transactions])

  const periodMonths = useMemo(() => {
    if (period === 'all') {
      return availableMonths
    }

    const monthsToInclude = PERIOD_OPTIONS.find((option) => option.value === period)?.months ?? 6
    return availableMonths.slice(-monthsToInclude)
  }, [availableMonths, period])

  const scopedTransactions = useMemo(() => {
    if (periodMonths.length === 0) return []

    const monthSet = new Set(periodMonths)
    return transactions.filter((transaction) => monthSet.has(transaction.competenceMonth.slice(0, 7)))
  }, [transactions, periodMonths])

  const periodLabel = useMemo(() => {
    if (periodMonths.length === 0) return 'Sem dados'

    const first = formatMonthLabel(`${periodMonths[0]}-01`)
    const last = formatMonthLabel(`${periodMonths[periodMonths.length - 1]}-01`)
    return first === last ? first : `${first} a ${last}`
  }, [periodMonths])

  const summary = useMemo(() => {
    let realizedIncome = 0
    let realizedExpense = 0
    let openIncome = 0
    let openExpense = 0
    let paidCount = 0
    let openCount = 0
    let overdueCount = 0
    let overdueAmount = 0
    let dueSoonCount = 0
    let dueSoonAmount = 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()
    const nextSevenDaysTimestamp = todayTimestamp + (7 * 24 * 60 * 60 * 1000)

    for (const transaction of scopedTransactions) {
      if (transaction.status === 'CANCELLED') continue

      const amount = parseCurrencyValue(transaction.netAmount)
      const isOpen = OPEN_STATUSES.has(transaction.status)

      if (transaction.status === 'PAID') {
        paidCount += 1
        if (transaction.type === 'INCOME') realizedIncome += amount
        else realizedExpense += amount
      }

      if (isOpen) {
        openCount += 1
        if (transaction.type === 'INCOME') openIncome += amount
        else openExpense += amount
      }

      if (transaction.status === 'OVERDUE') {
        overdueCount += 1
        overdueAmount += amount
        continue
      }

      if (!isOpen) continue

      const dueDate = parseDate(transaction.dueDate)
      if (!dueDate) continue

      const dueTimestamp = dueDate.getTime()
      if (dueTimestamp >= todayTimestamp && dueTimestamp <= nextSevenDaysTimestamp) {
        dueSoonCount += 1
        dueSoonAmount += amount
      }
    }

    const result = realizedIncome - realizedExpense
    const settlementRate = paidCount + openCount > 0
      ? Number(((paidCount / (paidCount + openCount)) * 100).toFixed(1))
      : 0
    const margin = realizedIncome > 0 ? Number(((result / realizedIncome) * 100).toFixed(1)) : null

    return {
      realizedIncome,
      realizedExpense,
      result,
      openIncome,
      openExpense,
      overdueCount,
      overdueAmount,
      dueSoonCount,
      dueSoonAmount,
      settlementRate,
      margin,
    }
  }, [scopedTransactions])

  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expense: number }>()

    for (const transaction of scopedTransactions) {
      if (transaction.status === 'CANCELLED') continue
      const key = transaction.competenceMonth.slice(0, 7)
      if (!map.has(key)) map.set(key, { month: key, income: 0, expense: 0 })
      const entry = map.get(key)!
      const amount = parseCurrencyValue(transaction.netAmount)
      if (transaction.type === 'INCOME' && transaction.status === 'PAID') entry.income += amount
      if (transaction.type === 'EXPENSE' && transaction.status === 'PAID') entry.expense += amount
    }

    return Array.from(map.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((d) => ({
        month: formatMonthLabel(`${d.month}-01`),
        Receitas: Number(d.income.toFixed(2)),
        Despesas: Number(d.expense.toFixed(2)),
      }))
  }, [scopedTransactions])

  const balanceEvolution = useMemo(() => {
    const map = new Map<string, number>()

    for (const transaction of scopedTransactions) {
      if (transaction.status !== 'PAID') continue
      const key = transaction.competenceMonth.slice(0, 7)
      const amount = parseCurrencyValue(transaction.netAmount)
      const impact = transaction.type === 'INCOME' ? amount : -amount
      map.set(key, (map.get(key) || 0) + impact)
    }

    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    let cumulative = 0
    return sorted.map(([month, impact]) => {
      cumulative += impact
      return { month: formatMonthLabel(`${month}-01`), Saldo: Number(cumulative.toFixed(2)) }
    })
  }, [scopedTransactions])

  const categoryData = useMemo(() => {
    const map = new Map<string, number>()

    for (const transaction of scopedTransactions) {
      if (transaction.type !== 'EXPENSE' || transaction.status === 'CANCELLED') continue
      const amount = parseCurrencyValue(transaction.netAmount)
      map.set(transaction.categoryId, (map.get(transaction.categoryId) || 0) + amount)
    }

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

    return Array.from(map.entries())
      .map(([id, value]) => ({
        name: categoryMap.get(id) || 'Sem categoria',
        value: Number(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [scopedTransactions, categories])

  const realizedVsOpenData = useMemo(() => {
    let incomeRealized = 0
    let incomeOpen = 0
    let expenseRealized = 0
    let expenseOpen = 0

    for (const transaction of scopedTransactions) {
      if (transaction.status === 'CANCELLED') continue
      const amount = parseCurrencyValue(transaction.netAmount)

      if (transaction.type === 'INCOME') {
        if (transaction.status === 'PAID') incomeRealized += amount
        else if (OPEN_STATUSES.has(transaction.status)) incomeOpen += amount
        continue
      }

      if (transaction.status === 'PAID') expenseRealized += amount
      else if (OPEN_STATUSES.has(transaction.status)) expenseOpen += amount
    }

    return [
      {
        tipo: 'Receitas',
        Realizado: Number(incomeRealized.toFixed(2)),
        Aberto: Number(incomeOpen.toFixed(2)),
      },
      {
        tipo: 'Despesas',
        Realizado: Number(expenseRealized.toFixed(2)),
        Aberto: Number(expenseOpen.toFixed(2)),
      },
    ]
  }, [scopedTransactions])

  const criticalAgenda = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()
    const nextSevenDaysTimestamp = todayTimestamp + (7 * 24 * 60 * 60 * 1000)

    return scopedTransactions
      .filter((transaction) => transaction.status !== 'CANCELLED' && OPEN_STATUSES.has(transaction.status))
      .map((transaction) => {
        const dueDate = parseDate(transaction.dueDate)
        if (!dueDate) return null

        const dueTimestamp = dueDate.getTime()
        const isOverdue = transaction.status === 'OVERDUE' || dueTimestamp < todayTimestamp
        if (!isOverdue && dueTimestamp > nextSevenDaysTimestamp) return null

        return {
          id: transaction.id,
          description: transaction.description,
          type: transaction.type,
          status: transaction.status,
          dueDate: transaction.dueDate,
          amount: parseCurrencyValue(transaction.netAmount),
          priority: isOverdue ? 0 : 1,
          dueDateValue: dueDate.getTime(),
        } satisfies CriticalAgendaItem
      })
      .filter((item): item is CriticalAgendaItem => item !== null)
      .sort((a, b) => a.priority - b.priority || a.dueDateValue - b.dueDateValue)
      .slice(0, 8)
  }, [scopedTransactions])

  const axisLabel = useMemo(
    () => ({
      color: tokens.mutedText,
      fontSize: 12,
    }),
    [tokens.mutedText],
  )

  const monthlyOption = useMemo<EChartsOption>(() => ({
    animationDuration: 400,
    grid: { top: 16, right: 16, bottom: 40, left: 16, containLabel: true },
    legend: {
      bottom: 0,
      textStyle: { color: tokens.mutedText, fontSize: 12 },
      data: ['Receitas', 'Despesas'],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: 'rgba(148, 163, 184, 0.12)' },
      },
      backgroundColor: tokens.popover,
      borderColor: tokens.border,
      borderWidth: 1,
      textStyle: { color: tokens.text, fontFamily: 'inherit' },
      extraCssText: 'border-radius: 8px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);',
      formatter: (params: unknown) => {
        const rows = (Array.isArray(params) ? params : [params]) as Array<{
          axisValueLabel?: string
          seriesName?: string
          marker?: string
          value?: number | string
        }>
        const title = rows[0]?.axisValueLabel ?? ''
        const lines = rows.map((row) => `${row.marker ?? ''} ${row.seriesName}: <strong>${formatCurrency(Number(row.value ?? 0))}</strong>`)
        return [title, ...lines].join('<br/>')
      },
    },
    xAxis: {
      type: 'category',
      data: monthlyData.map((item) => item.month),
      axisLine: { lineStyle: { color: tokens.border } },
      axisTick: { show: false },
      axisLabel,
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        ...axisLabel,
        formatter: (value: number) => compactNumberFormatter.format(Number(value)),
      },
      splitLine: {
        lineStyle: { color: tokens.border, type: 'dashed', opacity: 0.3 },
      },
    },
    series: [
      {
        name: 'Receitas',
        type: 'bar',
        data: monthlyData.map((item) => item.Receitas),
        itemStyle: { color: tokens.success, borderRadius: [4, 4, 0, 0] },
        emphasis: { disabled: true },
      },
      {
        name: 'Despesas',
        type: 'bar',
        data: monthlyData.map((item) => item.Despesas),
        itemStyle: { color: tokens.danger, borderRadius: [4, 4, 0, 0] },
        emphasis: { disabled: true },
      },
    ],
  }), [axisLabel, formatCurrency, monthlyData, tokens.border, tokens.danger, tokens.mutedText, tokens.popover, tokens.success, tokens.text])

  const categoryOption = useMemo<EChartsOption>(() => ({
    animationDuration: 400,
    color: CHART_COLORS,
    tooltip: {
      trigger: 'item',
      backgroundColor: tokens.popover,
      borderColor: tokens.border,
      borderWidth: 1,
      textStyle: { color: tokens.text, fontFamily: 'inherit' },
      extraCssText: 'border-radius: 8px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);',
      formatter: (params: unknown) => {
        const row = params as { name?: string; value?: number | string; percent?: number }
        const value = Number(row.value ?? 0)
        return `
          <div style="min-width: 140px;">
            <div style="font-size: 12px; color: ${tokens.mutedText};">${row.name ?? 'Categoria'}</div>
            <div style="font-size: 14px; font-weight: 600; color: ${tokens.text};">${formatCurrency(value)}</div>
            <div style="font-size: 12px; color: ${tokens.mutedText}; margin-top: 2px;">${Number(row.percent ?? 0).toFixed(1)}%</div>
          </div>
        `
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      left: 'center',
      textStyle: { color: tokens.mutedText, fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '65%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: tokens.card,
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          disabled: true,
        },
        data: categoryData,
      },
    ],
  }), [categoryData, formatCurrency, tokens.border, tokens.card, tokens.mutedText, tokens.popover, tokens.text])

  const balanceOption = useMemo<EChartsOption>(() => ({
    animationDuration: 400,
    grid: { top: 16, right: 16, bottom: 24, left: 16, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: { color: tokens.border, type: 'dashed' },
      },
      backgroundColor: tokens.popover,
      borderColor: tokens.border,
      borderWidth: 1,
      textStyle: { color: tokens.text, fontFamily: 'inherit' },
      extraCssText: 'border-radius: 8px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);',
      formatter: (params: unknown) => {
        const rows = (Array.isArray(params) ? params : [params]) as Array<{
          axisValueLabel?: string
          value?: number | string
        }>
        const value = Number(rows[0]?.value ?? 0)
        return `${rows[0]?.axisValueLabel ?? ''}<br/><strong>${formatCurrency(value)}</strong>`
      },
    },
    xAxis: {
      type: 'category',
      data: balanceEvolution.map((item) => item.month),
      axisLine: { lineStyle: { color: tokens.border } },
      axisTick: { show: false },
      axisLabel,
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        ...axisLabel,
        formatter: (value: number) => compactNumberFormatter.format(Number(value)),
      },
      splitLine: {
        lineStyle: { color: tokens.border, type: 'dashed', opacity: 0.3 },
      },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 7,
        data: balanceEvolution.map((item) => item.Saldo),
        lineStyle: { color: tokens.primary, width: 3 },
        itemStyle: { color: tokens.primary, opacity: 1 },
        emphasis: { disabled: true },
      },
    ],
  }), [axisLabel, balanceEvolution, formatCurrency, tokens.border, tokens.popover, tokens.primary, tokens.text])

  const realizedOpenOption = useMemo<EChartsOption>(() => ({
    animationDuration: 400,
    grid: { top: 16, right: 16, bottom: 40, left: 16, containLabel: true },
    legend: {
      bottom: 0,
      textStyle: { color: tokens.mutedText, fontSize: 12 },
      data: ['Realizado', 'Aberto'],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: 'rgba(148, 163, 184, 0.12)' },
      },
      backgroundColor: tokens.popover,
      borderColor: tokens.border,
      borderWidth: 1,
      textStyle: { color: tokens.text, fontFamily: 'inherit' },
      extraCssText: 'border-radius: 8px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);',
      formatter: (params: unknown) => {
        const rows = (Array.isArray(params) ? params : [params]) as Array<{
          axisValueLabel?: string
          seriesName?: string
          marker?: string
          value?: number | string
        }>
        const title = rows[0]?.axisValueLabel ?? ''
        const lines = rows.map((row) => `${row.marker ?? ''} ${row.seriesName}: <strong>${formatCurrency(Number(row.value ?? 0))}</strong>`)
        return [title, ...lines].join('<br/>')
      },
    },
    xAxis: {
      type: 'category',
      data: realizedVsOpenData.map((item) => item.tipo),
      axisLine: { lineStyle: { color: tokens.border } },
      axisTick: { show: false },
      axisLabel,
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        ...axisLabel,
        formatter: (value: number) => compactNumberFormatter.format(Number(value)),
      },
      splitLine: {
        lineStyle: { color: tokens.border, type: 'dashed', opacity: 0.3 },
      },
    },
    series: [
      {
        name: 'Realizado',
        type: 'bar',
        data: realizedVsOpenData.map((item) => item.Realizado),
        itemStyle: { color: tokens.success, borderRadius: [4, 4, 0, 0] },
        emphasis: { disabled: true },
      },
      {
        name: 'Aberto',
        type: 'bar',
        data: realizedVsOpenData.map((item) => item.Aberto),
        itemStyle: { color: tokens.warning, borderRadius: [4, 4, 0, 0] },
        emphasis: { disabled: true },
      },
    ],
  }), [axisLabel, formatCurrency, realizedVsOpenData, tokens.border, tokens.mutedText, tokens.popover, tokens.success, tokens.text, tokens.warning])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="h-16 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {totalTransactions > 100 && (
        <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-4 py-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Os dados exibidos estão limitados às 100 transações mais recentes. Os valores podem não representar o total do período.
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Visão executiva do período</p>
          <p className="text-xs text-muted-foreground">Período analisado: {periodLabel}</p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-card p-1">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={period === option.value ? 'default' : 'ghost'}
              className="h-8 px-3"
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receitas realizadas</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.realizedIncome)}</p>
                <p className="text-xs text-muted-foreground">A receber: {formatCurrency(summary.openIncome)}</p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-success opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesas realizadas</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.realizedExpense)}</p>
                <p className="text-xs text-muted-foreground">A pagar: {formatCurrency(summary.openExpense)}</p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-danger opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resultado operacional</p>
                <p className={`text-2xl font-bold ${summary.result >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(summary.result)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.margin === null ? 'Margem: n/d' : `Margem: ${summary.margin.toFixed(1)}%`}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Atenção (7 dias)</p>
                <p className="text-2xl font-bold text-foreground">{summary.overdueCount + summary.dueSoonCount}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(summary.overdueAmount + summary.dueSoonAmount)}
                </p>
                <p className="text-xs text-muted-foreground">Liquidação: {summary.settlementRate.toFixed(1)}%</p>
              </div>
              <Clock className="h-8 w-8 text-warning opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card border-border h-[320px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Receitas vs Despesas</CardTitle>
            <CardDescription>Pagamentos realizados por mês de competência</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
              </div>
            ) : (
              <EChart option={monthlyOption} className="h-full" />
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border h-[320px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Despesas por categoria</CardTitle>
            <CardDescription>Distribuição das despesas</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
              </div>
            ) : (
              <EChart option={categoryOption} className="h-full" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card border-border h-[320px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Evolução do saldo</CardTitle>
            <CardDescription>Saldo acumulado com transações pagas</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {balanceEvolution.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
              </div>
            ) : (
              <EChart option={balanceOption} className="h-full" />
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border h-[320px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Realizado x em aberto</CardTitle>
            <CardDescription>Valores por tipo no período</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {realizedVsOpenData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
              </div>
            ) : (
              <EChart option={realizedOpenOption} className="h-full" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-foreground">Agenda financeira crítica</CardTitle>
          <CardDescription>Transações vencidas e vencendo nos próximos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {criticalAgenda.length === 0 ? (
            <div className="h-16 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Nenhuma transação crítica no período selecionado.</p>
            </div>
          ) : (
            <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
              {criticalAgenda.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type === 'INCOME' ? 'Receita' : 'Despesa'} • vencimento {formatDateOnly(item.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={STATUS_BADGE_VARIANT[item.status]}>{statusLabel(item.status)}</Badge>
                    <p className="text-sm font-semibold text-foreground mt-1">{formatCurrency(item.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
