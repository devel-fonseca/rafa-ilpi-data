import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Clock, TrendingUp } from 'lucide-react'
import type { FinancialTransaction, FinancialCategory } from '@/types/financial-operations'
import { formatMonthLabel, parseCurrencyValue, statusLabel } from '../financial.utils'

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

const STATUS_COLORS: Record<string, string> = {
  PAID: 'hsl(var(--success))',
  PENDING: 'hsl(var(--warning))',
  OVERDUE: 'hsl(var(--danger))',
  CANCELLED: 'hsl(var(--muted-foreground))',
  REFUNDED: 'hsl(var(--info))',
  PARTIALLY_PAID: 'hsl(210 50% 60%)',
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--popover-foreground))',
}

const axisStroke = 'hsl(var(--muted-foreground))'
const axisStyle = { fontSize: '12px' }
const legendStyle = { fontSize: '12px', color: 'hsl(var(--foreground))' }

export function DashboardSection({
  transactions,
  categories,
  isLoading,
  totalTransactions,
  formatCurrency,
}: DashboardSectionProps) {
  const currentMonth = new Date().toISOString().slice(0, 7)

  const summary = useMemo(() => {
    const currentMonthTxs = transactions.filter(
      (t) => t.competenceMonth.startsWith(currentMonth) && t.status !== 'CANCELLED',
    )

    const income = currentMonthTxs
      .filter((t) => t.type === 'INCOME' && t.status === 'PAID')
      .reduce((sum, t) => sum + parseCurrencyValue(t.netAmount), 0)

    const expense = currentMonthTxs
      .filter((t) => t.type === 'EXPENSE' && t.status === 'PAID')
      .reduce((sum, t) => sum + parseCurrencyValue(t.netAmount), 0)

    const pendingTxs = transactions.filter((t) => t.status === 'PENDING')
    const pendingTotal = pendingTxs.reduce((sum, t) => sum + parseCurrencyValue(t.netAmount), 0)

    return { income, expense, balance: income - expense, pendingCount: pendingTxs.length, pendingTotal }
  }, [transactions, currentMonth])

  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expense: number }>()

    for (const t of transactions) {
      if (t.status === 'CANCELLED') continue
      const key = t.competenceMonth.slice(0, 7)
      if (!map.has(key)) map.set(key, { month: key, income: 0, expense: 0 })
      const entry = map.get(key)!
      const amount = parseCurrencyValue(t.netAmount)
      if (t.type === 'INCOME' && t.status === 'PAID') entry.income += amount
      if (t.type === 'EXPENSE' && t.status === 'PAID') entry.expense += amount
    }

    return Array.from(map.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((d) => ({
        month: formatMonthLabel(`${d.month}-01`),
        Receitas: Number(d.income.toFixed(2)),
        Despesas: Number(d.expense.toFixed(2)),
      }))
  }, [transactions])

  const balanceEvolution = useMemo(() => {
    const map = new Map<string, number>()

    for (const t of transactions) {
      if (t.status !== 'PAID') continue
      const key = t.competenceMonth.slice(0, 7)
      const amount = parseCurrencyValue(t.netAmount)
      const impact = t.type === 'INCOME' ? amount : -amount
      map.set(key, (map.get(key) || 0) + impact)
    }

    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    let cumulative = 0
    return sorted.map(([month, impact]) => {
      cumulative += impact
      return { month: formatMonthLabel(`${month}-01`), Saldo: Number(cumulative.toFixed(2)) }
    })
  }, [transactions])

  const categoryData = useMemo(() => {
    const map = new Map<string, number>()

    for (const t of transactions) {
      if (t.type !== 'EXPENSE' || t.status === 'CANCELLED') continue
      const amount = parseCurrencyValue(t.netAmount)
      map.set(t.categoryId, (map.get(t.categoryId) || 0) + amount)
    }

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

    return Array.from(map.entries())
      .map(([id, value]) => ({
        name: categoryMap.get(id) || 'Sem categoria',
        value: Number(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [transactions, categories])

  const statusData = useMemo(() => {
    const map = new Map<string, number>()

    for (const t of transactions) {
      map.set(t.status, (map.get(t.status) || 0) + 1)
    }

    return Array.from(map.entries()).map(([status, count]) => ({
      status: statusLabel(status as FinancialTransaction['status']),
      key: status,
      Quantidade: count,
    }))
  }, [transactions])

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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receitas do mês</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.income)}</p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-success opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesas do mês</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.expense)}</p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-danger opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo do mês</p>
                <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(summary.balance)}
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
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-foreground">{summary.pendingCount}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(summary.pendingTotal)}</p>
              </div>
              <Clock className="h-8 w-8 text-warning opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts - Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue vs Expenses Bar Chart */}
        <Card className="bg-card border-border h-[320px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Receitas vs Despesas</CardTitle>
            <CardDescription>Por mês de competência</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="month" stroke={axisStroke} style={axisStyle} />
                  <YAxis stroke={axisStroke} style={axisStyle} tickFormatter={(v) => `${v}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="hsl(var(--danger))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category Pie Chart */}
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
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={legendStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts - Row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Balance Evolution Line Chart */}
        <Card className="bg-card border-border h-[320px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Evolução do saldo</CardTitle>
            <CardDescription>Saldo acumulado por mês</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {balanceEvolution.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="month" stroke={axisStroke} style={axisStyle} />
                  <YAxis stroke={axisStroke} style={axisStyle} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Line
                    type="monotone"
                    dataKey="Saldo"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Transactions by Status Bar Chart */}
        <Card className="bg-card border-border h-[320px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Transações por status</CardTitle>
            <CardDescription>Quantidade por status</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {statusData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="status" stroke={axisStroke} style={axisStyle} />
                  <YAxis stroke={axisStroke} style={axisStyle} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="Quantidade" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || 'hsl(var(--muted))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
