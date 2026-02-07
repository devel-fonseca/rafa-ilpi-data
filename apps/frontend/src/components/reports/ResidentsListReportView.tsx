import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { ResidentsListReport } from '@/services/reportsApi'
import { formatDate } from '@/utils/formatters'
import {
  Users,
  Calendar,
  TrendingUp,
  UserCheck,
  Clock,
} from 'lucide-react'

interface ResidentsListReportViewProps {
  report: ResidentsListReport
}

// Variantes do Badge para os graus de dependência
const DEPENDENCY_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'Grau I': 'secondary',
  'Grau II': 'default',
  'Grau III': 'destructive',
  'Não informado': 'outline',
}

function getDependencyVariant(level: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!level) return DEPENDENCY_VARIANTS['Não informado']

  for (const [key, value] of Object.entries(DEPENDENCY_VARIANTS)) {
    if (level.startsWith(key)) return value
  }
  return DEPENDENCY_VARIANTS['Não informado']
}

function getDependencyLabel(level: string | null): string {
  if (!level) return 'Não informado'

  // Simplificar labels longos
  // IMPORTANTE: Verificar Grau III e II antes de I, pois "Grau II" inclui "Grau I"
  if (level.includes('Grau III')) return 'Grau III'
  if (level.includes('Grau II')) return 'Grau II'
  if (level.includes('Grau I')) return 'Grau I'

  return level
}

export function ResidentsListReportView({ report }: ResidentsListReportViewProps) {
  const { summary, residents } = report

  return (
    <div className="space-y-6">
      {/* Resumo Executivo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Resumo Executivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total de Residentes */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Total de Residentes</span>
              </div>
              <p className="text-3xl font-bold">{summary.totalResidents}</p>
            </div>

            {/* Média de Idade */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Média de Idade</span>
              </div>
              <p className="text-3xl font-bold">
                {summary.averageAge} <span className="text-lg font-normal">anos</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Min: {summary.minAge} | Max: {summary.maxAge}
              </p>
            </div>

            {/* Tempo Médio de Permanência */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Permanência Média</span>
              </div>
              <p className="text-3xl font-bold">
                {Math.round(summary.averageStayDays / 30)} <span className="text-lg font-normal">meses</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ({summary.averageStayDays} dias)
              </p>
            </div>

            {/* Residentes Ativos */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Residentes Ativos</span>
              </div>
              <p className="text-3xl font-bold">
                {summary.totalResidents}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Status: Ativo
              </p>
            </div>
          </div>

          {/* Distribuição por Grau de Dependência */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Distribuição por Grau de Dependência
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {summary.byDependencyLevel.map((item) => (
                <div key={item.level} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge variant={getDependencyVariant(item.level)}>
                      {getDependencyLabel(item.level)}
                    </Badge>
                    <span className="text-sm font-medium">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Residentes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Lista de Residentes
            </span>
            <Badge variant="outline">{residents.length} residentes</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Idade</TableHead>
                  <TableHead>Data de Admissão</TableHead>
                  <TableHead>Grau de Dependência</TableHead>
                  <TableHead>Leito</TableHead>
                  <TableHead>Condições Crônicas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {residents.map((resident) => (
                  <TableRow key={resident.id}>
                    <TableCell className="font-medium">
                      {resident.fullName}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {resident.age} anos
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(resident.admissionDate)}
                      <span className="block text-xs">
                        ({Math.round(resident.stayDays / 30)} meses)
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getDependencyVariant(resident.dependencyLevel)}>
                        {getDependencyLabel(resident.dependencyLevel)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {resident.bedCode ? (
                        <Badge variant="secondary">{resident.bedCode}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {resident.conditions.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {resident.conditions.slice(0, 3).map((condition, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {condition}
                            </Badge>
                          ))}
                          {resident.conditions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{resident.conditions.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
