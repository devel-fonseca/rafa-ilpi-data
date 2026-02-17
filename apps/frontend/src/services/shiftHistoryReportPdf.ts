/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ShiftHistoryReport } from '@/services/reportsApi'
import { formatShiftStatusLabel } from '@/utils/shiftStatus'
import { getShiftHistoryRecordTypeLabel } from '@/utils/shiftHistoryRecordTypeLabel'
import { formatDateOnlySafe, formatDateTimeSafe } from '@/utils/dateHelpers'

interface PDFGenerationOptions {
  ilpiName: string
  cnpj: string
  userName: string
  printDate: string
  printDateTime: string
}

const PAGE_MARGIN = 15
const HEADER_HEIGHT = 30
const FOOTER_HEIGHT = 15

const FONTS = {
  title: 11,
  subtitle: 9.5,
  body: 8.5,
  bodyLarge: 9,
  footer: 7,
}

const COLORS = {
  headerBg: [240, 240, 245] as [number, number, number],
  zebraEven: [250, 250, 252] as [number, number, number],
  border: [220, 220, 225] as [number, number, number],
  textPrimary: [30, 30, 40] as [number, number, number],
  textSecondary: [100, 100, 110] as [number, number, number],
}

function formatDateOnly(dateString: string): string {
  return formatDateOnlySafe(`${dateString}T12:00:00.000Z`)
}

function formatDateTime(dateString: string): string {
  try {
    return formatDateTimeSafe(dateString)
  } catch {
    return dateString
  }
}

class ShiftHistoryReportPDFGenerator {
  private doc: jsPDF
  private options: PDFGenerationOptions
  private totalPages: number = 0

  constructor(options: PDFGenerationOptions) {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
    this.options = options
  }

  private addHeader(summary: ShiftHistoryReport['summary']) {
    const pageWidth = this.doc.internal.pageSize.getWidth()

    this.doc.setFontSize(FONTS.title)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(this.options.ilpiName, PAGE_MARGIN, PAGE_MARGIN)

    this.doc.setFontSize(FONTS.body)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`CNPJ: ${this.options.cnpj}`, PAGE_MARGIN, PAGE_MARGIN + 5)

    this.doc.setFontSize(FONTS.title)
    this.doc.setFont('helvetica', 'bold')
    const title = 'Relatório de Histórico de Plantão'
    const titleWidth = this.doc.getTextWidth(title)
    this.doc.text(title, (pageWidth - titleWidth) / 2, PAGE_MARGIN + 10)

    this.doc.setFontSize(FONTS.subtitle)
    this.doc.setFont('helvetica', 'normal')
    const subtitle = `Data: ${formatDateOnly(summary.date)} • ${summary.shiftName} (${summary.startTime}-${summary.endTime})`
    const subtitleWidth = this.doc.getTextWidth(subtitle)
    this.doc.text(subtitle, (pageWidth - subtitleWidth) / 2, PAGE_MARGIN + 15)

    this.doc.setFontSize(FONTS.body)
    const systemInfo = 'Documento gerado automaticamente pelo Rafa ILPI'
    const infoWidth = this.doc.getTextWidth(systemInfo)
    this.doc.text(systemInfo, pageWidth - PAGE_MARGIN - infoWidth, PAGE_MARGIN)

    this.doc.setLineWidth(0.5)
    this.doc.setDrawColor(...COLORS.border)
    this.doc.line(PAGE_MARGIN, HEADER_HEIGHT + 2, pageWidth - PAGE_MARGIN, HEADER_HEIGHT + 2)
  }

  private addFooter(pageNumber: number) {
    const pageHeight = this.doc.internal.pageSize.getHeight()
    const pageWidth = this.doc.internal.pageSize.getWidth()
    const footerY = pageHeight - FOOTER_HEIGHT

    this.doc.setLineWidth(0.5)
    this.doc.setDrawColor(...COLORS.border)
    this.doc.line(PAGE_MARGIN, footerY, pageWidth - PAGE_MARGIN, footerY)

    this.doc.setFontSize(FONTS.footer)
    this.doc.setTextColor(...COLORS.textSecondary)
    this.doc.text(
      `Impresso por ${this.options.userName} em ${this.options.printDateTime}`,
      PAGE_MARGIN,
      footerY + 5,
    )
    const pageInfo = `Página ${pageNumber} de ${this.totalPages}`
    const pageInfoWidth = this.doc.getTextWidth(pageInfo)
    this.doc.text(pageInfo, pageWidth - PAGE_MARGIN - pageInfoWidth, footerY + 5)
  }

  private drawPageDecorations(summary: ShiftHistoryReport['summary'], pageNumber: number) {
    this.addHeader(summary)
    this.addFooter(pageNumber)
  }

  private addSummaryTable(report: ShiftHistoryReport, startY: number): number {
    const { summary } = report

    autoTable(this.doc, {
      startY,
      head: [],
      body: [
        ['Status do plantão', formatShiftStatusLabel(summary.status)],
        ['Equipe', summary.teamName || 'Sem equipe'],
        ['Encerrado por', summary.closedBy],
        ['Encerrado em', formatDateTime(summary.closedAt)],
        ['Atividades totais', String(summary.totalActivities)],
        ['Atividades da equipe', String(summary.shiftMembersActivities)],
        ['Atividades de outros usuários', String(summary.otherUsersActivities)],
      ],
      theme: 'grid',
      styles: {
        fontSize: FONTS.body,
        cellPadding: 2,
        lineColor: COLORS.border,
        lineWidth: 0.1,
        fillColor: COLORS.headerBg,
      },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold' },
        1: { cellWidth: 95 },
      },
      tableWidth: 165,
      margin: {
        left: (this.doc.internal.pageSize.getWidth() - 165) / 2,
        right: PAGE_MARGIN,
        top: HEADER_HEIGHT + 5,
        bottom: FOOTER_HEIGHT + 5,
      },
    })

    return (this.doc as any).lastAutoTable.finalY
  }

  private addReportText(reportText: string, startY: number): number {
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('RELATÓRIO DE PASSAGEM / ENCERRAMENTO', PAGE_MARGIN, startY)

    autoTable(this.doc, {
      startY: startY + 3,
      head: [],
      body: [[reportText || '-']],
      theme: 'grid',
      styles: {
        fontSize: FONTS.body,
        cellPadding: 2,
        lineColor: COLORS.border,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: HEADER_HEIGHT + 5, bottom: FOOTER_HEIGHT + 5 },
    })

    return (this.doc as any).lastAutoTable.finalY
  }

  private addActivitiesTable(
    title: string,
    rows: ShiftHistoryReport['shiftMembersActivities'],
    startY: number,
  ): number {
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text(title, PAGE_MARGIN, startY)

    const bodyRows =
      rows.length > 0
        ? rows.map((row) => [
            row.registeredTime,
            row.recordDetails
              ? `${getShiftHistoryRecordTypeLabel(row.recordType)}\n${row.recordDetails}`
              : getShiftHistoryRecordTypeLabel(row.recordType),
            row.residentName,
            row.recordedBy,
            row.timestamp ? formatDateTime(row.timestamp) : '-',
          ])
        : [['-', 'Nenhuma atividade registrada', '-', '-', '-']]

    autoTable(this.doc, {
      startY: startY + 4,
      head: [['Hora Registrada', 'Tipo do Registro', 'Residente', 'Usuário que Registrou', 'Timestamp']],
      body: bodyRows,
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
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 45 },
        3: { cellWidth: 42 },
        4: { cellWidth: 'auto' },
      },
      alternateRowStyles: {
        fillColor: COLORS.zebraEven,
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: HEADER_HEIGHT + 5, bottom: FOOTER_HEIGHT + 5 },
      rowPageBreak: 'avoid',
    })

    return (this.doc as any).lastAutoTable.finalY
  }

  public generate(report: ShiftHistoryReport): jsPDF {
    let currentY = HEADER_HEIGHT + 8
    currentY = this.addSummaryTable(report, currentY) + 6
    currentY = this.addReportText(report.summary.report, currentY) + 8
    currentY = this.addActivitiesTable('ATIVIDADES DA EQUIPE DO PLANTÃO', report.shiftMembersActivities, currentY) + 8
    this.addActivitiesTable('ATIVIDADES REGISTRADAS POR OUTROS USUÁRIOS', report.otherUsersActivities, currentY)

    this.totalPages = this.doc.getNumberOfPages()
    for (let i = 1; i <= this.totalPages; i++) {
      this.doc.setPage(i)
      this.drawPageDecorations(report.summary, i)
    }

    return this.doc
  }
}

export function downloadShiftHistoryReportPDF(
  report: ShiftHistoryReport,
  options: PDFGenerationOptions,
  filename?: string,
) {
  const generator = new ShiftHistoryReportPDFGenerator(options)
  const doc = generator.generate(report)
  const defaultFilename = `relatorio-historico-plantao-${report.summary.shiftId}.pdf`
  doc.save(filename || defaultFilename)
}
