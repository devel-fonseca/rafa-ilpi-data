// ──────────────────────────────────────────────────────────────────────────────
//  SERVICE - Daily Report PDF Generator
// ──────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { MultiDayReport, DailyReport, DailyRecordReport } from '@/types/reports'
import { formatShiftStatusLabel } from '@/utils/shiftStatus'

// ========== TYPES ==========

interface PDFGenerationOptions {
  ilpiName: string
  cnpj: string
  userName: string
  printDate: string
}

// ========== CONSTANTS ==========

const PAGE_MARGIN = 15 // mm
const HEADER_HEIGHT = 30 // mm
const FOOTER_HEIGHT = 15 // mm
const TOTAL_PAGES_PLACEHOLDER = '{total_pages_count_string}'

// Tipografia (conforme especificação)
const FONTS = {
  title: 11,
  subtitle: 9.5,
  body: 8.5,
  bodyLarge: 9,
  footer: 7,
}

// Cores para zebra striping (leve para economizar tinta)
const COLORS = {
  headerBg: [240, 240, 245] as [number, number, number],
  zebraEven: [250, 250, 252] as [number, number, number],
  zebraOdd: [255, 255, 255] as [number, number, number],
  border: [220, 220, 225] as [number, number, number],
  textPrimary: [30, 30, 40] as [number, number, number],
  textSecondary: [100, 100, 110] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
}

// ========== HELPERS ==========

function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00.000Z')
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getDayOfWeek(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00.000Z')
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  return days[date.getDay()]
}

// ========== PDF GENERATION ==========

class DailyReportPDFGenerator {
  private doc: jsPDF
  private options: PDFGenerationOptions
  private totalPages: number = 0

  constructor(options: PDFGenerationOptions) {
    // Landscape orientation (A4)
    this.doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })
    this.options = options
  }

  private addHeader(
    reportDate: string,
    isMultiDay: boolean,
    endDate: string | undefined,
  ) {
    const doc = this.doc
    const pageWidth = doc.internal.pageSize.getWidth()

    // Título principal
    doc.setFontSize(FONTS.title)
    doc.setFont('helvetica', 'bold')
    doc.text(this.options.ilpiName, PAGE_MARGIN, PAGE_MARGIN)

    // CNPJ
    doc.setFontSize(FONTS.body)
    doc.setFont('helvetica', 'normal')
    doc.text(`CNPJ: ${this.options.cnpj}`, PAGE_MARGIN, PAGE_MARGIN + 5)

    // Título do relatório (centralizado)
    doc.setFontSize(FONTS.title)
    doc.setFont('helvetica', 'bold')
    const reportTitle = 'Relatório Diário de Atividades Assistenciais'
    const titleWidth = doc.getTextWidth(reportTitle)
    doc.text(reportTitle, (pageWidth - titleWidth) / 2, PAGE_MARGIN + 10)

    // Data/Período (centralizado)
    doc.setFontSize(FONTS.subtitle)
    doc.setFont('helvetica', 'normal')
    let dateText: string
    if (isMultiDay && endDate) {
      dateText = `Período: ${formatDate(reportDate)} a ${formatDate(endDate)} (00:00–23:59)`
    } else {
      dateText = `Data: ${formatDate(reportDate)} (00:00–23:59)`
    }
    const dateWidth = doc.getTextWidth(dateText)
    doc.text(dateText, (pageWidth - dateWidth) / 2, PAGE_MARGIN + 15)

    // Info do sistema e paginação (direita)
    doc.setFontSize(FONTS.body)
    doc.setFont('helvetica', 'normal')
    const systemInfo = `Documento gerado automaticamente pelo Rafa ILPI • Versão do relatório: 1.0`
    const systemInfoWidth = doc.getTextWidth(systemInfo)
    doc.text(systemInfo, pageWidth - PAGE_MARGIN - systemInfoWidth, PAGE_MARGIN)

    // Linha separadora
    doc.setLineWidth(0.5)
    doc.setDrawColor(...COLORS.border)
    doc.line(PAGE_MARGIN, HEADER_HEIGHT + 2, pageWidth - PAGE_MARGIN, HEADER_HEIGHT + 2)
  }

  private addFooter(pageNumber: number) {
    const doc = this.doc
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Linha separadora
    doc.setLineWidth(0.5)
    doc.setDrawColor(...COLORS.border)
    const footerY = pageHeight - FOOTER_HEIGHT
    doc.line(PAGE_MARGIN, footerY, pageWidth - PAGE_MARGIN, footerY)

    // Informação de impressão
    doc.setFontSize(FONTS.footer)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.textSecondary)
    const footerText = `Impresso por ${this.options.userName} em ${this.options.printDate}`
    doc.text(footerText, PAGE_MARGIN, footerY + 5)

    const pageInfo = `Página ${pageNumber} de ${this.totalPages}`
    const pageInfoWidth = doc.getTextWidth(pageInfo)
    doc.text(pageInfo, pageWidth - PAGE_MARGIN - pageInfoWidth, footerY + 5)
  }

  private drawPageDecorations(
    reportDate: string,
    isMultiDay: boolean,
    endDate: string | undefined,
    pageNumber: number,
  ) {
    this.addHeader(reportDate, isMultiDay, endDate)
    this.addFooter(pageNumber)
  }

  private getComplianceForTypes(summary: DailyReport['summary'], types: string[]) {
    const metrics = (summary.compliance || []).filter((metric) =>
      types.includes(metric.recordType),
    )
    const due = metrics.reduce((sum, metric) => sum + metric.due, 0)
    const done = metrics.reduce((sum, metric) => sum + metric.done, 0)
    const compliance = due > 0 ? Math.round((done / due) * 100) : null
    return { due, done, compliance }
  }

  private addSummaryTable(report: DailyReport, startY: number): number {
    const { summary } = report
    const feeding = this.getComplianceForTypes(summary, ['ALIMENTACAO', 'HIDRATACAO'])
    const monitoring = this.getComplianceForTypes(summary, ['MONITORAMENTO'])
    const hygiene = this.getComplianceForTypes(summary, ['HIGIENE'])

    autoTable(this.doc, {
      startY,
      head: [],
      body: [
        ['Total de Residentes', summary.totalResidents.toString()],
        ['Registros do Dia', summary.totalDailyRecords.toString()],
        [
          'Aderência à prescrição medicamentosa',
          `${summary.totalMedicationsScheduled > 0
            ? Math.round(
                (summary.totalMedicationsAdministered / summary.totalMedicationsScheduled) * 100,
              )
            : 0}% (${summary.totalMedicationsAdministered}/${summary.totalMedicationsScheduled})`,
        ],
        [
          'Aderência à higiene',
          hygiene.compliance !== null ? `${hygiene.compliance}% (${hygiene.done}/${hygiene.due})` : 'N/A',
        ],
        [
          'Aderência à alimentação e hidratação',
          feeding.compliance !== null ? `${feeding.compliance}% (${feeding.done}/${feeding.due})` : 'N/A',
        ],
        [
          'Aderência ao monitoramento',
          monitoring.compliance !== null ? `${monitoring.compliance}% (${monitoring.done}/${monitoring.due})` : 'N/A',
        ],
      ],
      theme: 'grid',
      styles: {
        fontSize: FONTS.body,
        cellPadding: 2,
        lineColor: COLORS.border,
        lineWidth: 0.1,
        fillColor: COLORS.headerBg,
      },
      headStyles: undefined,
      columnStyles: {
        0: { cellWidth: 110, fontStyle: 'bold' },
        1: { cellWidth: 50, halign: 'left', fontStyle: 'bold' },
      },
      alternateRowStyles: undefined,
      tableWidth: 160,
      margin: {
        left: (this.doc.internal.pageSize.getWidth() - 160) / 2,
        right: PAGE_MARGIN,
        top: HEADER_HEIGHT + 5,
        bottom: FOOTER_HEIGHT + 5,
      },
      didDrawPage: undefined,
    })

    return (this.doc as any).lastAutoTable.finalY
  }

  private addShiftsTable(report: DailyReport, startY: number): number {
    const { shifts } = report

    if (shifts.length === 0) {
      return startY
    }

    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('TURNOS DO DIA', PAGE_MARGIN, startY)

    // Add shift rows
    const shiftRows = shifts.map((shift) => [
      shift.name,
      `${shift.startTime} - ${shift.endTime}`,
      shift.teamName || 'Sem equipe',
      formatShiftStatusLabel(shift.status),
    ])

    autoTable(this.doc, {
      startY: startY + 4,
      head: [['Turno', 'Horário', 'Equipe', 'Status']],
      body: shiftRows,
      theme: 'grid',
      styles: {
        fontSize: FONTS.body,
        cellPadding: 2,
        lineColor: COLORS.border,
        lineWidth: 0.1,
      },
      alternateRowStyles: {
        fillColor: COLORS.zebraEven,
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 40 },
      },
      headStyles: {
        fillColor: COLORS.headerBg,
        textColor: COLORS.textPrimary,
        fontStyle: 'bold',
        fontSize: FONTS.bodyLarge,
        halign: 'left',
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: HEADER_HEIGHT + 5, bottom: FOOTER_HEIGHT + 5 },
      didDrawPage: undefined,
    })

    return (this.doc as any).lastAutoTable.finalY
  }

  private addCategoryTable(
    title: string,
    records: DailyRecordReport[],
    startY: number,
  ): number {
    if (records.length === 0) {
      return startY
    }

    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text(title, PAGE_MARGIN, startY)

    const recordRows = records.map((record) => [
      record.residentName,
      record.bedCode,
      record.time,
      this.formatRecordDetails(record),
      record.recordedBy,
    ])

    autoTable(this.doc, {
      startY: startY + 4,
      head: [['Residente', 'Leito', 'Hora', 'Registro', 'Registrado por']],
      body: recordRows,
      theme: 'grid',
      styles: {
        fontSize: FONTS.body,
        cellPadding: 2,
        lineColor: COLORS.border,
        lineWidth: 0.1,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: COLORS.headerBg,
        textColor: COLORS.textPrimary,
        fontStyle: 'bold',
        fontSize: FONTS.bodyLarge,
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 18 },
        2: { cellWidth: 15 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 35 },
      },
      alternateRowStyles: {
        fillColor: COLORS.zebraEven,
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: HEADER_HEIGHT + 5, bottom: FOOTER_HEIGHT + 5 },
      rowPageBreak: 'avoid',
      didDrawPage: undefined,
    })

    return (this.doc as any).lastAutoTable.finalY
  }

  private formatRecordDetails(record: DailyRecordReport): string {
    const details = record.details
    const getField = (field: string): string => {
      const value = details[field]
      return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
    }
    const getNumberField = (field: string): number | null => {
      const value = details[field]
      if (typeof value === 'number' && Number.isFinite(value)) return value
      if (typeof value === 'string') {
        const parsed = Number(value.replace(',', '.'))
        return Number.isFinite(parsed) ? parsed : null
      }
      return null
    }
    const getBooleanField = (field: string): boolean | null => {
      const value = details[field]
      if (typeof value === 'boolean') return value
      return null
    }

    let formatted = ''

    switch (record.type) {
      case 'HIGIENE': {
        const parts: string[] = []

        const tipoBanho = getField('tipoBanho')
        const duracao = getField('duracao')
        const condicaoPele = getField('condicaoPele')
        const localAlteracao = getField('localAlteracao')
        const quantidadeFraldas = getField('quantidadeFraldas')
        const higieneBucal = getBooleanField('higieneBucal')
        const trocaFralda = getBooleanField('trocaFralda')
        const hidratanteAplicado = getBooleanField('hidratanteAplicado')

        if (tipoBanho) {
          parts.push(
            duracao && tipoBanho !== 'Sem banho'
              ? `Banho: ${tipoBanho} (${duracao} min)`
              : `Banho: ${tipoBanho}`,
          )
        }

        if (condicaoPele && localAlteracao) {
          parts.push(`Pele: ${condicaoPele} (${localAlteracao})`)
        } else if (condicaoPele) {
          parts.push(`Pele: ${condicaoPele}`)
        } else if (localAlteracao) {
          parts.push(`Local da alteração: ${localAlteracao}`)
        }

        if (higieneBucal === true) {
          parts.push('Higiene bucal: Sim')
        }

        if (hidratanteAplicado === true) {
          parts.push('Hidratante aplicado: Sim')
        }

        if (trocaFralda === true) {
          parts.push(
            quantidadeFraldas
              ? `Troca de fralda: Sim (${quantidadeFraldas})`
              : 'Troca de fralda: Sim',
          )
        }

        formatted = parts.join(' • ') || 'Sem detalhes'
        break
      }
      case 'ALIMENTACAO':
        formatted = `${getField('refeicao') || 'Refeição'} • Ingestão: ${getField('ingeriu') || 'N/A'} • ${getField('volumeMl') || 0}ml`
        break
      case 'HIDRATACAO':
        formatted = `${getField('tipo') || 'Líquido'} • ${getField('volumeMl') || 0}ml`
        break
      case 'MONITORAMENTO':
        formatted = `PA: ${getField('pressaoArterial') || 'N/A'} • FC: ${getField('frequenciaCardiaca') || 'N/A'} bpm • Tax: ${getField('temperatura') || 'N/A'}°C • SpO2: ${getField('saturacaoO2') || 'N/A'}% • Gli: ${getField('glicemia') || 'N/A'} mg/dL`
        break
      case 'INTERCORRENCIA':
        formatted = `${getField('descricao') || 'N/A'}`
        if (getField('acaoTomada')) {
          formatted += ` • Ação: ${getField('acaoTomada')}`
        }
        break
      case 'COMPORTAMENTO': {
        const descricao = getField('descricao')
        formatted = descricao || 'Sem detalhes'
        break
      }
      case 'HUMOR': {
        const humor = getField('humor')
        const outroHumor = getField('outroHumor')
        const obsHumor = getField('observacoes')
        if (!humor) {
          formatted = 'Sem detalhes'
        } else {
          formatted = humor
          if (humor === 'Outro' && outroHumor) formatted += ` (${outroHumor})`
          if (obsHumor) formatted += ` • ${obsHumor}`
        }
        break
      }
      case 'SONO': {
        const padrao = getField('padraoSono')
        const outroPadrao = getField('outroPadrao')
        const obsSono = getField('observacoes')
        if (!padrao) {
          formatted = 'Sem detalhes'
        } else {
          formatted = padrao
          if (padrao === 'Outro' && outroPadrao) formatted += ` (${outroPadrao})`
          if (obsSono) formatted += ` • ${obsSono}`
        }
        break
      }
      case 'ELIMINACAO': {
        const rawType = getField('tipo')
        const eliminationType =
          rawType === 'Urina'
            ? 'Eliminação Urinária'
            : rawType === 'Fezes'
              ? 'Eliminação Intestinal'
              : (rawType || 'N/A')
        const parts: string[] = [eliminationType]

        if (rawType === 'Fezes') {
          const consistencia = getField('consistencia')
          const cor = getField('cor')
          const volume = getField('volume')
          if (consistencia) parts.push(consistencia)
          if (cor) parts.push(cor)
          if (volume) parts.push(volume)
        } else if (rawType === 'Urina') {
          const cor = getField('cor')
          const odor = getField('odor')
          const volume = getField('volume')
          if (cor) parts.push(cor)
          if (odor && odor !== 'Normal') parts.push(`Odor: ${odor}`)
          if (volume) parts.push(volume)
        }

        const trocaFralda = getBooleanField('trocaFralda')
        if (trocaFralda === true) {
          parts.push('Troca de fralda: Sim')
        }

        formatted = parts.join(' • ')
        break
      }
      case 'PESO': {
        const peso = getNumberField('peso')
        const alturaRaw = getNumberField('altura')
        const alturaMetros =
          alturaRaw && alturaRaw > 0
            ? (alturaRaw > 3 ? alturaRaw / 100 : alturaRaw)
            : null
        const alturaCm = alturaMetros ? Math.round(alturaMetros * 100) : null
        const imcRaw = getNumberField('imc')
        const imcCalculado =
          peso && alturaMetros
            ? peso / (alturaMetros * alturaMetros)
            : null
        const imc =
          imcRaw && imcRaw > 0 && imcRaw < 150
            ? imcRaw
            : imcCalculado

        const parts: string[] = []
        parts.push(`${peso !== null ? peso : 'N/A'} kg`)
        if (alturaCm !== null) parts.push(`${alturaCm} cm`)
        parts.push(`IMC: ${imc !== null ? imc.toFixed(1) : 'N/A'}`)

        formatted = parts.join(' • ')
        break
      }
      case 'ATIVIDADES':
        formatted = getField('atividade') || getField('descricao') || 'Sem detalhes'
        break
      case 'VISITA':
        formatted = `Visitante: ${getField('visitante') || 'N/A'} • ${getField('observacao')}`
        break
      default:
        formatted = getField('descricao') || getField('observacao') || 'Sem detalhes'
    }

    if (record.notes) {
      formatted += ` • Obs: ${record.notes}`
    }

    return formatted
  }

  private addMedicationsTable(report: DailyReport, startY: number): number {
    const { medicationAdministrations } = report

    if (medicationAdministrations.length === 0) {
      return startY
    }

    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('ADMINISTRAÇÃO DE MEDICAMENTOS', PAGE_MARGIN, startY)

    const medRows = medicationAdministrations.map((med) => [
      med.residentName,
      med.bedCode,
      med.actualTime || med.scheduledTime,
      `${med.medicationName} ${med.concentration || ''} ${med.dose || ''} – ${med.wasAdministered ? 'Administrado' : 'Não administrado'}`,
      med.administeredBy || '-',
    ])

    autoTable(this.doc, {
      startY: startY + 4,
      head: [['Residente', 'Leito', 'Hora', 'Registro', 'Registrado por']],
      body: medRows,
      theme: 'grid',
      styles: {
        fontSize: FONTS.body,
        cellPadding: 2,
        lineColor: COLORS.border,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.headerBg,
        textColor: COLORS.textPrimary,
        fontStyle: 'bold',
        fontSize: FONTS.bodyLarge,
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 18 },
        2: { cellWidth: 15 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 35 },
      },
      alternateRowStyles: {
        fillColor: COLORS.zebraEven,
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: HEADER_HEIGHT + 5, bottom: FOOTER_HEIGHT + 5 },
      rowPageBreak: 'avoid',
      didDrawPage: undefined,
    })

    return (this.doc as any).lastAutoTable.finalY
  }

  private generateDayReport(report: DailyReport) {
    const pageHeight = this.doc.internal.pageSize.getHeight()
    let currentY = HEADER_HEIGHT + 5

    // Add day title with day of week
    this.doc.setFontSize(FONTS.subtitle)
    this.doc.setFont('helvetica', 'bold')
    const dayTitle = `${formatDate(report.summary.date)} - ${getDayOfWeek(report.summary.date)}`
    this.doc.text(dayTitle, PAGE_MARGIN, currentY)
    currentY += 7

    // Add RESUMO EXECUTIVO title
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('RESUMO EXECUTIVO', PAGE_MARGIN, currentY)
    currentY += 5

    // Summary Table
    currentY = this.addSummaryTable(report, currentY) + 5

    // Check if we need a new page
    if (currentY > pageHeight - FOOTER_HEIGHT - 40) {
      this.doc.addPage()
      currentY = HEADER_HEIGHT + 5
    }

    // Shifts Table
    currentY = this.addShiftsTable(report, currentY) + 5

    // Check page break
    if (currentY > pageHeight - FOOTER_HEIGHT - 40) {
      this.doc.addPage()
      currentY = HEADER_HEIGHT + 5
    }

    // Category tables
    const categoriesBeforeMedications = [
      { title: 'INTERCORRÊNCIAS', types: ['INTERCORRENCIA'] },
      { title: 'MONITORAMENTO (Sinais Vitais)', types: ['MONITORAMENTO'] },
    ]

    const categoriesAfterMedications = [
      { title: 'HIGIENE', types: ['HIGIENE'] },
      { title: 'ALIMENTAÇÃO + HIDRATAÇÃO', types: ['ALIMENTACAO', 'HIDRATACAO'] },
      { title: 'ELIMINAÇÃO', types: ['ELIMINACAO'] },
      { title: 'ESTADO COMPORTAMENTAL E SONO', types: ['COMPORTAMENTO', 'HUMOR', 'SONO'] },
      { title: 'PESO / ALTURA', types: ['PESO'] },
      { title: 'ATIVIDADES', types: ['ATIVIDADES'] },
      { title: 'VISITAS', types: ['VISITA'] },
      { title: 'OUTROS', types: ['OUTROS'] },
    ]

    const renderCategory = (category: { title: string; types: string[] }) => {
      if (currentY > pageHeight - FOOTER_HEIGHT - 40) {
        this.doc.addPage()
        currentY = HEADER_HEIGHT + 5
      }

      const records = report.dailyRecords.filter((record) =>
        category.types.includes(record.type),
      )

      if (records.length > 0) {
        currentY =
          this.addCategoryTable(category.title, records, currentY) +
          5
        return
      }

      this.doc.setFontSize(FONTS.bodyLarge)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...COLORS.textPrimary)
      this.doc.text(category.title, PAGE_MARGIN, currentY)

      this.doc.setFontSize(FONTS.body)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...COLORS.textSecondary)
      this.doc.text('Nenhum registro nesta categoria para o dia.', PAGE_MARGIN, currentY + 5)

      currentY += 12
    }

    for (const category of categoriesBeforeMedications) {
      renderCategory(category)
    }

    // Medications
    if (currentY > pageHeight - FOOTER_HEIGHT - 40) {
      this.doc.addPage()
      currentY = HEADER_HEIGHT + 5
    }

    currentY = this.addMedicationsTable(report, currentY) + 5

    for (const category of categoriesAfterMedications) {
      renderCategory(category)
    }
  }

  public generate(multiDayReport: MultiDayReport): jsPDF {
    const { reports, startDate, endDate } = multiDayReport
    const isMultiDay = reports.length > 1

    // First pass: count total pages (approximate)
    this.totalPages = reports.length * 3 // Estimativa inicial

    // Generate reports for each day
    reports.forEach((report, index) => {
      if (index > 0) {
        // New page for each day
        this.doc.addPage()
      }

      this.generateDayReport(report)
    })

    this.totalPages = this.doc.getNumberOfPages()
    if (typeof (this.doc as any).putTotalPages === 'function') {
      (this.doc as any).putTotalPages(TOTAL_PAGES_PLACEHOLDER)
    }

    for (let page = 1; page <= this.totalPages; page += 1) {
      this.doc.setPage(page)
      this.drawPageDecorations(startDate, isMultiDay, endDate, page)
    }

    return this.doc
  }

  public save(filename: string) {
    this.doc.save(filename)
  }

  public getBlob(): Blob {
    return this.doc.output('blob')
  }
}

// ========== PUBLIC API ==========

export function generateDailyReportPDF(
  multiDayReport: MultiDayReport,
  options: PDFGenerationOptions
): jsPDF {
  const generator = new DailyReportPDFGenerator(options)
  return generator.generate(multiDayReport)
}

export function downloadDailyReportPDF(
  multiDayReport: MultiDayReport,
  options: PDFGenerationOptions,
  filename?: string
) {
  const generator = new DailyReportPDFGenerator(options)
  generator.generate(multiDayReport)

  const defaultFilename = `relatorio-diario-${multiDayReport.startDate}${
    multiDayReport.reports.length > 1 ? `-a-${multiDayReport.endDate}` : ''
  }.pdf`

  generator.save(filename || defaultFilename)
}
