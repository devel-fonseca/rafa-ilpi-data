// ──────────────────────────────────────────────────────────────────────────────
//  SERVICE - Residents List Report PDF Generator
// ──────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ResidentsListReport } from '@/services/reportsApi'

// ========== TYPES ==========

interface PDFGenerationOptions {
  ilpiName: string
  cnpj: string
  userName: string
  printDate: string
  printDateTime: string
}

// ========== CONSTANTS ==========

const PAGE_MARGIN = 15 // mm
const HEADER_HEIGHT = 30 // mm
const FOOTER_HEIGHT = 15 // mm

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

function getDependencyLabel(level: string | null): string {
  if (!level) return 'Não informado'

  // IMPORTANTE: Verificar Grau III e II antes de I, pois "Grau II" inclui "Grau I"
  if (level.includes('Grau III')) return 'Grau III'
  if (level.includes('Grau II')) return 'Grau II'
  if (level.includes('Grau I')) return 'Grau I'

  return level
}

// ========== PDF GENERATION ==========

class ResidentsListReportPDFGenerator {
  private doc: jsPDF
  private options: PDFGenerationOptions
  private totalPages: number = 0

  constructor(options: PDFGenerationOptions) {
    // Portrait orientation (A4)
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
    this.options = options
  }

  private addHeader() {
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
    const reportTitle = 'Lista de Residentes'
    const titleWidth = doc.getTextWidth(reportTitle)
    doc.text(reportTitle, (pageWidth - titleWidth) / 2, PAGE_MARGIN + 10)

    // Data de geração (centralizado)
    doc.setFontSize(FONTS.subtitle)
    doc.setFont('helvetica', 'normal')
    const dateText = `Data: ${this.options.printDate}`
    const dateWidth = doc.getTextWidth(dateText)
    doc.text(dateText, (pageWidth - dateWidth) / 2, PAGE_MARGIN + 15)

    // Info do sistema (direita)
    doc.setFontSize(FONTS.body)
    doc.setFont('helvetica', 'normal')
    const systemInfo = `Documento gerado automaticamente pelo Rafa ILPI`
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
    const footerText = `Impresso por ${this.options.userName} em ${this.options.printDateTime}`
    doc.text(footerText, PAGE_MARGIN, footerY + 5)

    const pageInfo = `Página ${pageNumber} de ${this.totalPages}`
    const pageInfoWidth = doc.getTextWidth(pageInfo)
    doc.text(pageInfo, pageWidth - PAGE_MARGIN - pageInfoWidth, footerY + 5)
  }

  private drawPageDecorations(pageNumber: number) {
    this.addHeader()
    this.addFooter(pageNumber)
  }

  private addSummaryTable(report: ResidentsListReport, startY: number): number {
    const { summary } = report

    // Garantir que todos os três graus apareçam, mesmo com 0
    const allDependencyLevels = ['Grau I', 'Grau II', 'Grau III']
    const dependencyMap = new Map(
      summary.byDependencyLevel.map((dep) => [getDependencyLabel(dep.level), dep])
    )

    // Construir linhas do resumo
    const summaryRows: string[][] = [
      ['Total de Residentes', summary.totalResidents.toString()],
    ]

    // Adicionar distribuição por grau de dependência logo após o total
    for (const level of allDependencyLevels) {
      const dep = dependencyMap.get(level)
      if (dep) {
        summaryRows.push([level, `${dep.count} residentes (${dep.percentage}%)`])
      } else {
        summaryRows.push([level, '0 residentes (0%)'])
      }
    }

    // Adicionar média de idade e permanência após os graus
    summaryRows.push(
      ['Média de Idade', `${summary.averageAge} anos (Min: ${summary.minAge} | Max: ${summary.maxAge})`],
      ['Permanência Média', `${Math.round(summary.averageStayDays / 30)} meses (${summary.averageStayDays} dias)`],
    )

    autoTable(this.doc, {
      startY,
      head: [],
      body: summaryRows,
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
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 80, halign: 'left', fontStyle: 'bold' },
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

  private addResidentsTable(report: ResidentsListReport, startY: number): number {
    const { residents } = report

    if (residents.length === 0) {
      return startY
    }

    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('LISTA DE RESIDENTES', PAGE_MARGIN, startY)

    const residentRows = residents.map((resident) => [
      resident.fullName,
      `${resident.age} anos`,
      formatDate(resident.admissionDate),
      resident.bedCode || '-',
      getDependencyLabel(resident.dependencyLevel),
    ])

    autoTable(this.doc, {
      startY: startY + 4,
      head: [['Nome', 'Idade', 'Admissão', 'Leito', 'Grau Dependência']],
      body: residentRows,
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
        0: { cellWidth: 'auto' },
        1: { cellWidth: 22 },
        2: { cellWidth: 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 40 },
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

  public generate(report: ResidentsListReport): jsPDF {
    let currentY = HEADER_HEIGHT + 5

    // Título do resumo
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('RESUMO EXECUTIVO', PAGE_MARGIN, currentY)
    currentY += 5

    // Summary Table
    currentY = this.addSummaryTable(report, currentY) + 8

    // Residents Table
    currentY = this.addResidentsTable(report, currentY) + 5

    // Calcular total de páginas e adicionar decorações
    this.totalPages = this.doc.getNumberOfPages()

    for (let page = 1; page <= this.totalPages; page += 1) {
      this.doc.setPage(page)
      this.drawPageDecorations(page)
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

export function generateResidentsListReportPDF(
  report: ResidentsListReport,
  options: PDFGenerationOptions
): jsPDF {
  const generator = new ResidentsListReportPDFGenerator(options)
  return generator.generate(report)
}

export function downloadResidentsListReportPDF(
  report: ResidentsListReport,
  options: PDFGenerationOptions,
  filename?: string
) {
  const generator = new ResidentsListReportPDFGenerator(options)
  generator.generate(report)

  const today = new Date().toISOString().split('T')[0]
  const defaultFilename = `lista-residentes-${today}.pdf`

  generator.save(filename || defaultFilename)
}
