/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { InstitutionalResidentProfileReport } from '@/services/reportsApi'
import { getRecordTypeLabel, isRecordType } from '@/utils/recordTypeLabels'

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

function formatDate(dateString: string): string {
  const date = new Date(`${dateString}T12:00:00.000Z`)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatRoutineType(recordType: string): string {
  if (isRecordType(recordType)) {
    return getRecordTypeLabel(recordType).label
  }
  return recordType
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatMonthLabel(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return value
  const [year, month] = value.split('-')
  return `${month}/${year}`
}

class InstitutionalResidentProfileReportPDFGenerator {
  private doc: jsPDF
  private options: PDFGenerationOptions
  private totalPages = 0

  constructor(options: PDFGenerationOptions) {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
    this.options = options
  }

  private addHeader() {
    const pageWidth = this.doc.internal.pageSize.getWidth()

    this.doc.setFontSize(FONTS.title)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(this.options.ilpiName, PAGE_MARGIN, PAGE_MARGIN)

    this.doc.setFontSize(FONTS.body)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`CNPJ: ${this.options.cnpj}`, PAGE_MARGIN, PAGE_MARGIN + 5)

    const reportTitle = 'Relatório Institucional • Perfil dos Residentes'
    this.doc.setFontSize(FONTS.title)
    this.doc.setFont('helvetica', 'bold')
    const titleWidth = this.doc.getTextWidth(reportTitle)
    this.doc.text(reportTitle, (pageWidth - titleWidth) / 2, PAGE_MARGIN + 10)

    const dateText = `Data: ${this.options.printDate}`
    this.doc.setFontSize(FONTS.subtitle)
    this.doc.setFont('helvetica', 'normal')
    const dateWidth = this.doc.getTextWidth(dateText)
    this.doc.text(dateText, (pageWidth - dateWidth) / 2, PAGE_MARGIN + 15)

    const systemInfo = 'Documento gerado automaticamente pelo Rafa ILPI'
    this.doc.setFontSize(FONTS.body)
    const systemInfoWidth = this.doc.getTextWidth(systemInfo)
    this.doc.text(systemInfo, pageWidth - PAGE_MARGIN - systemInfoWidth, PAGE_MARGIN)

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
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...COLORS.textSecondary)
    this.doc.text(`Impresso por ${this.options.userName} em ${this.options.printDateTime}`, PAGE_MARGIN, footerY + 5)

    const pageInfo = `Página ${pageNumber} de ${this.totalPages}`
    const pageInfoWidth = this.doc.getTextWidth(pageInfo)
    this.doc.text(pageInfo, pageWidth - PAGE_MARGIN - pageInfoWidth, footerY + 5)
  }

  private addSummary(report: InstitutionalResidentProfileReport, startY: number): number {
    const { summary } = report
    autoTable(this.doc, {
      startY,
      head: [],
      body: [
        ['Data de referência', formatDate(summary.referenceDate)],
        ['Residentes ativos', String(summary.totalResidents)],
        ['Média de idade', `${summary.averageAge} anos (${summary.minAge}-${summary.maxAge})`],
        ['Permanência média', `${summary.averageStayDays} dias`],
        ['Com responsável legal', String(summary.residentsWithLegalGuardian)],
        ['Sem leito atribuído', String(summary.residentsWithoutBed)],
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
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 80 },
      },
      tableWidth: 160,
      margin: { left: (this.doc.internal.pageSize.getWidth() - 160) / 2, right: PAGE_MARGIN },
    })

    return (this.doc as any).lastAutoTable.finalY
  }

  private addDependencySection(report: InstitutionalResidentProfileReport, startY: number): number {
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('1-2. PERFIL DEMOGRAFICO E DEPENDENCIA', PAGE_MARGIN, startY)

    autoTable(this.doc, {
      startY: startY + 4,
      head: [['Sexo', 'Quantidade', '%']],
      body: report.genderDistribution.map((item) => [item.label, String(item.count), `${item.percentage}%`]),
      theme: 'grid',
      styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1 },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.textPrimary, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 35, halign: 'center' }, 2: { cellWidth: 35, halign: 'center' } },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      alternateRowStyles: { fillColor: COLORS.zebraEven },
    })

    const afterGender = (this.doc as any).lastAutoTable.finalY + 4
    autoTable(this.doc, {
      startY: afterGender,
      head: [['Grau de Dependência', 'Residentes', '%', 'Cuidadores (teórico)']],
      body: report.dependencyDistribution.map((item) => [
        item.level,
        String(item.count),
        `${item.percentage}%`,
        String(item.requiredCaregivers),
      ]),
      theme: 'grid',
      styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1 },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.textPrimary, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 75 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 50, halign: 'center' },
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      alternateRowStyles: { fillColor: COLORS.zebraEven },
    })

    return (this.doc as any).lastAutoTable.finalY
  }

  private addClinicalSection(report: InstitutionalResidentProfileReport, startY: number): number {
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('3. PERFIL CLINICO ASSISTENCIAL', PAGE_MARGIN, startY)

    const clinical = report.clinicalIndicators
    autoTable(this.doc, {
      startY: startY + 4,
      head: [],
      body: [
        ['Condições crônicas', `${clinical.totalConditions} (${clinical.residentsWithConditions} residentes)`],
        ['Alergias', `${clinical.totalAllergies} (${clinical.residentsWithAllergies} residentes)`],
        ['Alergias graves', String(clinical.severeAllergies)],
        ['Restrições alimentares', `${clinical.totalDietaryRestrictions} (${clinical.residentsWithDietaryRestrictions} residentes)`],
        ['Com contraindicações assistenciais', String(clinical.residentsWithContraindications)],
      ],
      theme: 'grid',
      styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1, fillColor: COLORS.headerBg },
      columnStyles: { 0: { cellWidth: 95, fontStyle: 'bold' }, 1: { cellWidth: 75 } },
      tableWidth: 170,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    })

    let currentY = (this.doc as any).lastAutoTable.finalY

    if (report.topConditions.length > 0) {
      autoTable(this.doc, {
        startY: currentY + 4,
        head: [['Condição', 'Residentes', '%']],
        body: report.topConditions.map((item) => [item.condition, String(item.count), `${item.percentage}%`]),
        theme: 'grid',
        styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1 },
        headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.textPrimary, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 115 }, 1: { cellWidth: 28, halign: 'center' }, 2: { cellWidth: 27, halign: 'center' } },
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        alternateRowStyles: { fillColor: COLORS.zebraEven },
      })
      currentY = (this.doc as any).lastAutoTable.finalY
    }

    return currentY
  }

  private addCareLoadSection(report: InstitutionalResidentProfileReport, startY: number): number {
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('6. CARGA ASSISTENCIAL ATUAL', PAGE_MARGIN, startY)

    autoTable(this.doc, {
      startY: startY + 4,
      head: [],
      body: [
        ['Medicações ativas', String(report.careLoadSummary.totalActiveMedications)],
        ['Residentes com polifarmácia (>=5)', String(report.careLoadSummary.residentsWithPolypharmacy)],
        ['Rotinas assistenciais ativas', String(report.careLoadSummary.totalRoutineSchedules)],
      ],
      theme: 'grid',
      styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1, fillColor: COLORS.headerBg },
      columnStyles: { 0: { cellWidth: 100, fontStyle: 'bold' }, 1: { cellWidth: 70 } },
      tableWidth: 170,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    })

    let currentY = (this.doc as any).lastAutoTable.finalY
    if (report.routineLoadByType.length > 0) {
      autoTable(this.doc, {
        startY: currentY + 4,
        head: [['Tipo de rotina', 'Configurações ativas']],
        body: report.routineLoadByType.map((item) => [
          formatRoutineType(item.recordType),
          String(item.count),
        ]),
        theme: 'grid',
        styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1 },
        headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.textPrimary, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 40, halign: 'center' } },
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        alternateRowStyles: { fillColor: COLORS.zebraEven },
      })
      currentY = (this.doc as any).lastAutoTable.finalY
    }

    return currentY
  }

  private addTrendSection(report: InstitutionalResidentProfileReport, startY: number): number {
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text(`FASE 2. TENDENCIAS (${report.trendMonths} MESES)`, PAGE_MARGIN, startY)

    autoTable(this.doc, {
      startY: startY + 4,
      head: [['Mês', 'Res.', 'G I', 'G II', 'G III', 'N/I', 'Cuid. teórico']],
      body: report.dependencyTrend.map((row) => [
        formatMonthLabel(row.month),
        String(row.totalResidents),
        String(row.grauI),
        String(row.grauII),
        String(row.grauIII),
        String(row.notInformed),
        String(row.requiredCaregivers),
      ]),
      theme: 'grid',
      styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1 },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.textPrimary, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 35, halign: 'center' },
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      alternateRowStyles: { fillColor: COLORS.zebraEven },
    })

    autoTable(this.doc, {
      startY: (this.doc as any).lastAutoTable.finalY + 4,
      head: [['Mês', 'Registros diários', 'Admin. medicação', 'Registros por residente']],
      body: report.careLoadTrend.map((row) => [
        formatMonthLabel(row.month),
        String(row.dailyRecordsCount),
        String(row.medicationAdministrationsCount),
        String(row.recordsPerResident),
      ]),
      theme: 'grid',
      styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1 },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.textPrimary, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 45, halign: 'center' },
        2: { cellWidth: 50, halign: 'center' },
        3: { cellWidth: 47, halign: 'center' },
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      alternateRowStyles: { fillColor: COLORS.zebraEven },
    })

    return (this.doc as any).lastAutoTable.finalY
  }

  private addResidentsTable(report: InstitutionalResidentProfileReport, startY: number): number {
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('RESIDENTES (VISAO ATUAL)', PAGE_MARGIN, startY)

    autoTable(this.doc, {
      startY: startY + 4,
      head: [['Residente', 'Leito', 'Dep.', 'C/A/R', 'Meds', 'Rotinas', 'Contra.', 'Aval. dep.']],
      body: report.residents.map((resident) => [
        resident.fullName,
        resident.bedCode || '-',
        resident.dependencyLevel,
        `${resident.conditionsCount}/${resident.allergiesCount}/${resident.dietaryRestrictionsCount}`,
        String(resident.activeMedicationsCount),
        String(resident.routineSchedulesCount),
        resident.hasContraindications ? 'Sim' : 'Nao',
        resident.dependencyAssessmentDate ? formatDate(resident.dependencyAssessmentDate) : '-',
      ]),
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
        0: { cellWidth: 42 },
        1: { cellWidth: 16 },
        2: { cellWidth: 18 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' },
        7: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: HEADER_HEIGHT + 5, bottom: FOOTER_HEIGHT + 5 },
      alternateRowStyles: { fillColor: COLORS.zebraEven },
      rowPageBreak: 'avoid',
    })

    return (this.doc as any).lastAutoTable.finalY
  }

  public generate(report: InstitutionalResidentProfileReport): jsPDF {
    let currentY = HEADER_HEIGHT + 5

    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('RESUMO EXECUTIVO', PAGE_MARGIN, currentY)
    currentY += 5

    currentY = this.addSummary(report, currentY) + 8
    currentY = this.addDependencySection(report, currentY) + 8
    currentY = this.addClinicalSection(report, currentY) + 8
    currentY = this.addCareLoadSection(report, currentY) + 8
    currentY = this.addTrendSection(report, currentY) + 8
    this.addResidentsTable(report, currentY)

    this.totalPages = (this.doc as any).getNumberOfPages()
    for (let page = 1; page <= this.totalPages; page += 1) {
      this.doc.setPage(page)
      this.addHeader()
      this.addFooter(page)
    }

    return this.doc
  }

  public save(filename: string) {
    this.doc.save(filename)
  }
}

export function downloadInstitutionalResidentProfileReportPDF(
  report: InstitutionalResidentProfileReport,
  options: PDFGenerationOptions,
  filename?: string,
) {
  const generator = new InstitutionalResidentProfileReportPDFGenerator(options)
  generator.generate(report)
  const defaultFilename = `perfil-residentes-${report.summary.referenceDate}.pdf`
  generator.save(filename || defaultFilename)
}
