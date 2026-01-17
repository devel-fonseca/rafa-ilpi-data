import { useState } from 'react'
import { formatDateTimeSafe, formatDateTimeShortSafe, formatDateOnlySafe, getCurrentDateTime } from '@/utils/dateHelpers'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Download,
  FileText,
  FileSpreadsheet,
  Printer,
  Search,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Extend jsPDF type for autoTable
interface AutoTableOptions {
  head?: unknown[][]
  body?: unknown[][]
  startY?: number
  theme?: string
  headStyles?: Record<string, unknown>
  styles?: Record<string, unknown>
  [key: string]: unknown
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: AutoTableOptions) => jsPDF
  }
}

interface VitalSignData {
  id: string
  timestamp: string
  systolicBloodPressure?: number
  diastolicBloodPressure?: number
  temperature?: number
  heartRate?: number
  oxygenSaturation?: number
  bloodGlucose?: number
  recordedBy?: string
  notes?: string
}

interface VitalSignsTableProps {
  data: VitalSignData[]
  residentName: string
}

type SortField = 'timestamp' | 'systolic' | 'temperature' | 'heartRate' | 'oxygenSaturation' | 'bloodGlucose'
type SortOrder = 'asc' | 'desc'

export function VitalSignsTable({ data, residentName }: VitalSignsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Filtrar dados
  const filteredData = data.filter((item) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      formatDateTimeSafe(item.timestamp)
        .toLowerCase()
        .includes(search) ||
      item.recordedBy?.toLowerCase().includes(search) ||
      item.notes?.toLowerCase().includes(search)
    )
  })

  // Ordenar dados
  const sortedData = [...filteredData].sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (sortField) {
      case 'timestamp':
        aValue = a.timestamp
        bValue = b.timestamp
        break
      case 'systolic':
        aValue = a.systolicBloodPressure || 0
        bValue = b.systolicBloodPressure || 0
        break
      case 'temperature':
        aValue = a.temperature || 0
        bValue = b.temperature || 0
        break
      case 'heartRate':
        aValue = a.heartRate || 0
        bValue = b.heartRate || 0
        break
      case 'oxygenSaturation':
        aValue = a.oxygenSaturation || 0
        bValue = b.oxygenSaturation || 0
        break
      case 'bloodGlucose':
        aValue = a.bloodGlucose || 0
        bValue = b.bloodGlucose || 0
        break
    }

    // Timestamp comparison uses string localeCompare, numeric comparisons use subtraction
    if (sortField === 'timestamp') {
      return sortOrder === 'asc'
        ? (aValue as string).localeCompare(bValue as string)
        : (bValue as string).localeCompare(aValue as string)
    } else {
      return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
    }
  })

  // Função para mudar ordenação
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Determinar se valor está crítico
  const isCritical = (type: string, value?: number) => {
    if (!value) return false
    switch (type) {
      case 'systolic':
        return value >= 140 || value < 90
      case 'diastolic':
        return value >= 90 || value < 60
      case 'temperature':
        return value >= 38 || value < 35
      case 'heartRate':
        return value >= 100 || value < 60
      case 'oxygenSaturation':
        return value < 92
      case 'bloodGlucose':
        return value >= 180 || value < 70
      default:
        return false
    }
  }

  // Exportar para CSV
  const exportToCSV = () => {
    const csvData = sortedData.map((item) => ({
      'Data/Hora': formatDateTimeSafe(item.timestamp),
      'PA Sistólica': item.systolicBloodPressure || '',
      'PA Diastólica': item.diastolicBloodPressure || '',
      'Temperatura': item.temperature || '',
      'FC': item.heartRate || '',
      'SpO2': item.oxygenSaturation || '',
      'Glicemia': item.bloodGlucose || '',
      'Registrado por': item.recordedBy || '',
      'Observações': item.notes || '',
    }))

    const ws = XLSX.utils.json_to_sheet(csvData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sinais Vitais')
    XLSX.writeFile(wb, `sinais_vitais_${residentName.replace(/\s+/g, '_')}_${formatDateOnlySafe(new Date().toISOString()).replace(/\//g, '')}.xlsx`)
  }

  // Exportar para PDF
  const exportToPDF = () => {
    const pdf = new jsPDF()

    // Título
    pdf.setFontSize(16)
    pdf.text(`Sinais Vitais - ${residentName}`, 14, 20)
    pdf.setFontSize(10)
    pdf.text(`Gerado em: ${getCurrentDateTime()}`, 14, 28)

    // Dados da tabela
    const tableData = sortedData.map((item) => [
      formatDateTimeShortSafe(item.timestamp),
      item.systolicBloodPressure && item.diastolicBloodPressure
        ? `${item.systolicBloodPressure}/${item.diastolicBloodPressure}`
        : '-',
      item.temperature ? `${item.temperature}°C` : '-',
      item.heartRate ? `${item.heartRate}` : '-',
      item.oxygenSaturation ? `${item.oxygenSaturation}%` : '-',
      item.bloodGlucose ? `${item.bloodGlucose}` : '-',
    ])

    pdf.autoTable({
      head: [['Data/Hora', 'PA', 'Temp', 'FC', 'SpO₂', 'Glicemia']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
    })

    pdf.save(`sinais_vitais_${residentName.replace(/\s+/g, '_')}_${formatDateOnlySafe(new Date().toISOString()).replace(/\//g, '')}.pdf`)
  }

  // Imprimir
  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sinais Vitais - ${residentName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 20px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .critical { color: red; font-weight: bold; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Sinais Vitais - ${residentName}</h1>
        <p>Gerado em: ${getCurrentDateTime()}</p>
        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>PA</th>
              <th>Temperatura</th>
              <th>FC</th>
              <th>SpO₂</th>
              <th>Glicemia</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>
            ${sortedData
              .map(
                (item) => `
              <tr>
                <td>${formatDateTimeSafe(item.timestamp)}</td>
                <td class="${isCritical('systolic', item.systolicBloodPressure) ? 'critical' : ''}">
                  ${item.systolicBloodPressure && item.diastolicBloodPressure
                    ? `${item.systolicBloodPressure}/${item.diastolicBloodPressure}`
                    : '-'}
                </td>
                <td class="${isCritical('temperature', item.temperature) ? 'critical' : ''}">
                  ${item.temperature ? `${item.temperature}°C` : '-'}
                </td>
                <td class="${isCritical('heartRate', item.heartRate) ? 'critical' : ''}">
                  ${item.heartRate || '-'}
                </td>
                <td class="${isCritical('oxygenSaturation', item.oxygenSaturation) ? 'critical' : ''}">
                  ${item.oxygenSaturation ? `${item.oxygenSaturation}%` : '-'}
                </td>
                <td class="${isCritical('bloodGlucose', item.bloodGlucose) ? 'critical' : ''}">
                  ${item.bloodGlucose || '-'}
                </td>
                <td>${item.notes || '-'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
      printWindow.close()
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 text-muted-foreground" />
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de ferramentas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('timestamp')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Data/Hora
                  <SortIcon field="timestamp" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('systolic')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  PA
                  <SortIcon field="systolic" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('temperature')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Temperatura
                  <SortIcon field="temperature" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('heartRate')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  FC
                  <SortIcon field="heartRate" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('oxygenSaturation')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  SpO₂
                  <SortIcon field="oxygenSaturation" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('bloodGlucose')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Glicemia
                  <SortIcon field="bloodGlucose" />
                </Button>
              </TableHead>
              <TableHead>Registrado por</TableHead>
              <TableHead>Observações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {formatDateTimeSafe(item.timestamp)}
                </TableCell>
                <TableCell>
                  {item.systolicBloodPressure && item.diastolicBloodPressure ? (
                    <Badge
                      variant={
                        isCritical('systolic', item.systolicBloodPressure) ||
                        isCritical('diastolic', item.diastolicBloodPressure)
                          ? 'destructive'
                          : 'outline'
                      }
                    >
                      {item.systolicBloodPressure}/{item.diastolicBloodPressure}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {item.temperature ? (
                    <Badge
                      variant={isCritical('temperature', item.temperature) ? 'destructive' : 'outline'}
                    >
                      {item.temperature}°C
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {item.heartRate ? (
                    <Badge
                      variant={isCritical('heartRate', item.heartRate) ? 'destructive' : 'outline'}
                    >
                      {item.heartRate} bpm
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {item.oxygenSaturation ? (
                    <Badge
                      variant={
                        isCritical('oxygenSaturation', item.oxygenSaturation)
                          ? 'destructive'
                          : 'outline'
                      }
                    >
                      {item.oxygenSaturation}%
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {item.bloodGlucose ? (
                    <Badge
                      variant={isCritical('bloodGlucose', item.bloodGlucose) ? 'destructive' : 'outline'}
                    >
                      {item.bloodGlucose} mg/dL
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{item.recordedBy || '-'}</TableCell>
                <TableCell className="max-w-[200px] truncate">{item.notes || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Resumo */}
      <div className="text-sm text-muted-foreground">
        Mostrando {sortedData.length} de {data.length} registros
      </div>
    </div>
  )
}