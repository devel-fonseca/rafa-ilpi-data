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

const TABLE_MARGIN = {
  left: PAGE_MARGIN,
  right: PAGE_MARGIN,
  top: HEADER_HEIGHT + 5,
  bottom: FOOTER_HEIGHT + 5,
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

function formatShortDate(dateString: string): string {
  const date = new Date(`${dateString}T12:00:00.000Z`)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

class InstitutionalResidentProfileReportPDFGenerator {
  private doc: jsPDF
  private options: PDFGenerationOptions
  private totalPages = 0

  constructor(options: PDFGenerationOptions) {
    this.doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })
    this.options = options
  }

  private getContentWidth(): number {
    return this.doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2
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
    const contentWidth = this.getContentWidth()
    const summaryWidth = contentWidth * 0.5
    const summaryFill = [247, 247, 250] as [number, number, number]
    autoTable(this.doc, {
      startY,
      head: [],
      body: [
        ['Data de referência', formatDate(summary.referenceDate)],
        ['Residentes ativos', String(summary.totalResidents)],
        ['Média de idade', `${summary.averageAge} anos (${summary.minAge}-${summary.maxAge})`],
        ['Permanência média', `${summary.averageStayDays} dias`],
        ['Cuidadores mínimos por turno', String(report.complexityIndicators.requiredCaregiversPerShift)],
        ['Com responsável legal', String(summary.residentsWithLegalGuardian)],
        ['Sem responsável legal', String(report.governanceQualityIndicators.residentsWithoutLegalGuardian)],
        ['Sem contato de emergência', String(report.governanceQualityIndicators.residentsWithoutEmergencyContact)],
        ['Sem leito atribuído', String(summary.residentsWithoutBed)],
        ['Sem contrato vigente', String(report.governanceQualityIndicators.residentsWithoutActiveContract)],
      ],
      theme: 'grid',
      styles: {
        fontSize: FONTS.body,
        cellPadding: 2,
        lineColor: COLORS.border,
        lineWidth: 0.1,
        fillColor: summaryFill,
      },
      columnStyles: {
        0: { cellWidth: summaryWidth * 0.62, fontStyle: 'bold' },
        1: { cellWidth: summaryWidth * 0.38 },
      },
      tableWidth: summaryWidth,
      margin: {
        ...TABLE_MARGIN,
        left: PAGE_MARGIN + (contentWidth - summaryWidth) / 2,
      },
    })

    return (this.doc as any).lastAutoTable.finalY
  }

  private addDependencySection(report: InstitutionalResidentProfileReport, startY: number): number {
    const contentWidth = this.getContentWidth()
    const sectionStartY = startY + 4
    const tableGap = 6
    const genderTableWidth = contentWidth * 0.35
    const dependencyTableWidth = contentWidth - genderTableWidth - tableGap
    const genderTableLeft = PAGE_MARGIN
    const dependencyTableLeft = genderTableLeft + genderTableWidth + tableGap

    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('1. PERFIL DEMOGRAFICO E DEPENDENCIA', PAGE_MARGIN, startY)

    autoTable(this.doc, {
      startY: sectionStartY,
      head: [['Sexo', 'Quantidade', '%']],
      body: report.genderDistribution.map((item) => [item.label, String(item.count), `${item.percentage}%`]),
      theme: 'grid',
      styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1 },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.textPrimary, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: genderTableWidth * 0.52 },
        1: { cellWidth: genderTableWidth * 0.24, halign: 'center' },
        2: { cellWidth: genderTableWidth * 0.24, halign: 'center' },
      },
      tableWidth: genderTableWidth,
      margin: { ...TABLE_MARGIN, left: genderTableLeft },
      alternateRowStyles: { fillColor: COLORS.zebraEven },
    })

    const genderTableFinalY = (this.doc as any).lastAutoTable.finalY

    autoTable(this.doc, {
      startY: sectionStartY,
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
        0: { cellWidth: dependencyTableWidth * 0.46 },
        1: { cellWidth: dependencyTableWidth * 0.18, halign: 'center' },
        2: { cellWidth: dependencyTableWidth * 0.14, halign: 'center' },
        3: { cellWidth: dependencyTableWidth * 0.22, halign: 'center' },
      },
      tableWidth: dependencyTableWidth,
      margin: { ...TABLE_MARGIN, left: dependencyTableLeft },
      alternateRowStyles: { fillColor: COLORS.zebraEven },
    })

    const dependencyTableFinalY = (this.doc as any).lastAutoTable.finalY
    return Math.max(genderTableFinalY, dependencyTableFinalY)
  }

  private addClinicalSection(report: InstitutionalResidentProfileReport, startY: number): number {
    const contentWidth = this.getContentWidth()
    const summaryWidth = contentWidth * 0.5
    const summaryFill = [247, 247, 250] as [number, number, number]
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('2. PERFIL CLINICO ASSISTENCIAL', PAGE_MARGIN, startY)

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
        ['Total de contraindicações registradas', String(clinical.contraindicationsTotal)],
      ],
      theme: 'grid',
      styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1, fillColor: summaryFill },
      columnStyles: { 0: { cellWidth: summaryWidth * 0.68, fontStyle: 'bold' }, 1: { cellWidth: summaryWidth * 0.32 } },
      tableWidth: summaryWidth,
      margin: {
        ...TABLE_MARGIN,
        left: PAGE_MARGIN + (contentWidth - summaryWidth) / 2,
      },
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
        columnStyles: {
          0: { cellWidth: contentWidth * 0.7 },
          1: { cellWidth: contentWidth * 0.15, halign: 'center' },
          2: { cellWidth: contentWidth * 0.15, halign: 'center' },
        },
        margin: TABLE_MARGIN,
        alternateRowStyles: { fillColor: COLORS.zebraEven },
      })
      currentY = (this.doc as any).lastAutoTable.finalY
    }

    if (report.allergiesBySeverity.length > 0) {
      autoTable(this.doc, {
        startY: currentY + 4,
        head: [['Severidade de alergia', 'Quantidade']],
        body: report.allergiesBySeverity.map((item) => [item.severity, String(item.count)]),
        theme: 'grid',
        styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1 },
        headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.textPrimary, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: contentWidth * 0.78 }, 1: { cellWidth: contentWidth * 0.22, halign: 'center' } },
        tableWidth: contentWidth,
        margin: TABLE_MARGIN,
        alternateRowStyles: { fillColor: COLORS.zebraEven },
      })
      currentY = (this.doc as any).lastAutoTable.finalY
    }

    if (report.dietaryRestrictionsByType.length > 0) {
      autoTable(this.doc, {
        startY: currentY + 4,
        head: [['Tipo de restrição alimentar', 'Quantidade']],
        body: report.dietaryRestrictionsByType.map((item) => [item.type, String(item.count)]),
        theme: 'grid',
        styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1 },
        headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.textPrimary, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: contentWidth * 0.78 }, 1: { cellWidth: contentWidth * 0.22, halign: 'center' } },
        tableWidth: contentWidth,
        margin: TABLE_MARGIN,
        alternateRowStyles: { fillColor: COLORS.zebraEven },
      })
      currentY = (this.doc as any).lastAutoTable.finalY
    }

    return currentY
  }

  private addNutritionalFunctionalSection(report: InstitutionalResidentProfileReport, startY: number): number {
    const contentWidth = this.getContentWidth()
    const summaryWidth = contentWidth * 0.5
    const summaryFill = [247, 247, 250] as [number, number, number]
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('3. ESTADO NUTRICIONAL E FUNCIONAL', PAGE_MARGIN, startY)

    autoTable(this.doc, {
      startY: startY + 4,
      head: [],
      body: [
        [
          `Sem antropometria recente (${report.nutritionalFunctionalIndicators.anthropometryRecencyDays} dias)`,
          `${report.nutritionalFunctionalIndicators.percentWithoutRecentAnthropometry}%`,
        ],
        [
          'Sem avaliação de dependência vigente',
          `${report.nutritionalFunctionalIndicators.percentWithoutDependencyAssessment}%`,
        ],
        [
          'Sem perfil clínico preenchido',
          `${report.nutritionalFunctionalIndicators.percentWithoutClinicalProfile}%`,
        ],
      ],
      theme: 'grid',
      styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1, fillColor: summaryFill },
      columnStyles: { 0: { cellWidth: summaryWidth * 0.82, fontStyle: 'bold' }, 1: { cellWidth: summaryWidth * 0.18, halign: 'center' } },
      tableWidth: summaryWidth,
      margin: {
        ...TABLE_MARGIN,
        left: PAGE_MARGIN + (contentWidth - summaryWidth) / 2,
      },
    })

    autoTable(this.doc, {
      startY: (this.doc as any).lastAutoTable.finalY + 4,
      head: [['Categoria IMC', 'Quantidade', '%']],
      body: report.nutritionalFunctionalIndicators.bmiDistribution.map((item) => [
        item.category,
        String(item.count),
        `${item.percentage}%`,
      ]),
      theme: 'grid',
      styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1 },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.textPrimary, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.68 },
        1: { cellWidth: contentWidth * 0.16, halign: 'center' },
        2: { cellWidth: contentWidth * 0.16, halign: 'center' },
      },
      tableWidth: contentWidth,
      margin: TABLE_MARGIN,
      alternateRowStyles: { fillColor: COLORS.zebraEven },
    })

    const afterBmiTable = (this.doc as any).lastAutoTable.finalY
    const bmiLegend =
      'Referência IMC utilizada no cálculo: Baixo peso < 18,5; Adequado 18,5 a < 25,0; Sobrepeso maior ou igual a 25,0.'
    const legendLines = this.doc.splitTextToSize(bmiLegend, contentWidth)
    const pageHeight = this.doc.internal.pageSize.getHeight()
    const maxContentY = pageHeight - FOOTER_HEIGHT - 6
    let legendY = afterBmiTable + 3

    if (legendY + legendLines.length * 3 > maxContentY) {
      this.doc.addPage()
      legendY = HEADER_HEIGHT + 8
    }

    this.doc.setFont('times', 'italic')
    this.doc.setFontSize(7)
    this.doc.setTextColor(...COLORS.textSecondary)
    legendLines.forEach((line, index) => {
      this.doc.text(line, PAGE_MARGIN, legendY + index * 3)
    })
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(FONTS.body)
    this.doc.setTextColor(...COLORS.textPrimary)

    return legendY + legendLines.length * 3
  }

  private addTreatmentRoutineSection(report: InstitutionalResidentProfileReport, startY: number): number {
    const contentWidth = this.getContentWidth()
    const summaryWidth = contentWidth * 0.5
    const summaryFill = [247, 247, 250] as [number, number, number]
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('4. TRATAMENTO E ROTINA ASSISTENCIAL', PAGE_MARGIN, startY)

    autoTable(this.doc, {
      startY: startY + 4,
      head: [],
      body: [
        ['Residentes com prescrição ativa', String(report.treatmentRoutineIndicators.residentsWithActivePrescription)],
        ['Residentes com polifarmácia (>=5)', String(report.treatmentRoutineIndicators.residentsWithPolypharmacy)],
        ['Medicações ativas', String(report.treatmentRoutineIndicators.totalActiveMedications)],
        ['Rotinas assistenciais ativas', String(report.treatmentRoutineIndicators.totalRoutineSchedules)],
      ],
      theme: 'grid',
      styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1, fillColor: summaryFill },
      columnStyles: { 0: { cellWidth: summaryWidth * 0.82, fontStyle: 'bold' }, 1: { cellWidth: summaryWidth * 0.18, halign: 'center' } },
      tableWidth: summaryWidth,
      margin: {
        ...TABLE_MARGIN,
        left: PAGE_MARGIN + (contentWidth - summaryWidth) / 2,
      },
    })

    let currentY = (this.doc as any).lastAutoTable.finalY
    if (report.treatmentRoutineIndicators.routineCoverageByType.length > 0) {
      autoTable(this.doc, {
        startY: currentY + 4,
        head: [['Cobertura de rotina', 'Devido', 'Realizado', '%']],
        body: report.treatmentRoutineIndicators.routineCoverageByType.map((item) => [
          formatRoutineType(item.recordType),
          String(item.due),
          String(item.done),
          `${item.compliance}%`,
        ]),
        theme: 'grid',
        styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1 },
        headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.textPrimary, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: contentWidth * 0.55 },
          1: { cellWidth: contentWidth * 0.15, halign: 'center' },
          2: { cellWidth: contentWidth * 0.15, halign: 'center' },
          3: { cellWidth: contentWidth * 0.15, halign: 'center' },
        },
        margin: TABLE_MARGIN,
        alternateRowStyles: { fillColor: COLORS.zebraEven },
      })
      currentY = (this.doc as any).lastAutoTable.finalY
    }

    return currentY
  }

  private addGovernanceSection(report: InstitutionalResidentProfileReport, startY: number): number {
    const contentWidth = this.getContentWidth()
    const summaryWidth = contentWidth * 0.5
    const summaryFill = [247, 247, 250] as [number, number, number]
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('5. GOVERNANCA E QUALIDADE DE CADASTRO', PAGE_MARGIN, startY)

    autoTable(this.doc, {
      startY: startY + 4,
      head: [],
      body: [
        ['Sem responsável legal', String(report.governanceQualityIndicators.residentsWithoutLegalGuardian)],
        ['Sem contato de emergência', String(report.governanceQualityIndicators.residentsWithoutEmergencyContact)],
        ['Sem leito definido', String(report.governanceQualityIndicators.residentsWithoutBed)],
        ['Sem contrato vigente', String(report.governanceQualityIndicators.residentsWithoutActiveContract)],
        ['Com campos críticos incompletos', String(report.governanceQualityIndicators.residentsWithCriticalIncompleteFields)],
      ],
      theme: 'grid',
      styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1, fillColor: summaryFill },
      columnStyles: { 0: { cellWidth: summaryWidth * 0.82, fontStyle: 'bold' }, 1: { cellWidth: summaryWidth * 0.18, halign: 'center' } },
      tableWidth: summaryWidth,
      margin: {
        ...TABLE_MARGIN,
        left: PAGE_MARGIN + (contentWidth - summaryWidth) / 2,
      },
    })

    let currentY = (this.doc as any).lastAutoTable.finalY
    if (report.criticalIncompleteResidents.length > 0) {
      autoTable(this.doc, {
        startY: currentY + 4,
        head: [['Residente', 'Leito', 'Qtd', 'Campos incompletos']],
        body: report.criticalIncompleteResidents.map((item) => [
          item.residentName,
          item.bedCode || '-',
          String(item.missingFieldsCount),
          item.missingFields.join(' • '),
        ]),
        theme: 'grid',
        styles: { fontSize: FONTS.body, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1, overflow: 'linebreak' },
        headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.textPrimary, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: contentWidth * 0.24 },
          1: { cellWidth: contentWidth * 0.1, halign: 'center' },
          2: { cellWidth: contentWidth * 0.08, halign: 'center' },
          3: { cellWidth: contentWidth * 0.58 },
        },
        margin: TABLE_MARGIN,
        alternateRowStyles: { fillColor: COLORS.zebraEven },
      })
      currentY = (this.doc as any).lastAutoTable.finalY
    }

    return currentY
  }

  private addTrendSection(report: InstitutionalResidentProfileReport, startY: number): number {
    const contentWidth = this.getContentWidth()
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text(`6. TENDENCIAS (${report.trendMonths} MESES)`, PAGE_MARGIN, startY)

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
        0: { cellWidth: contentWidth * 0.2 },
        1: { cellWidth: contentWidth * 0.12, halign: 'center' },
        2: { cellWidth: contentWidth * 0.12, halign: 'center' },
        3: { cellWidth: contentWidth * 0.12, halign: 'center' },
        4: { cellWidth: contentWidth * 0.12, halign: 'center' },
        5: { cellWidth: contentWidth * 0.12, halign: 'center' },
        6: { cellWidth: contentWidth * 0.2, halign: 'center' },
      },
      margin: TABLE_MARGIN,
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
        0: { cellWidth: contentWidth * 0.18 },
        1: { cellWidth: contentWidth * 0.28, halign: 'center' },
        2: { cellWidth: contentWidth * 0.28, halign: 'center' },
        3: { cellWidth: contentWidth * 0.26, halign: 'center' },
      },
      margin: TABLE_MARGIN,
      alternateRowStyles: { fillColor: COLORS.zebraEven },
    })

    return (this.doc as any).lastAutoTable.finalY
  }

  private addResidentsTable(report: InstitutionalResidentProfileReport, startY: number): number {
    const contentWidth = this.getContentWidth()
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text('7. RESIDENTES (VISAO ATUAL)', PAGE_MARGIN, startY)

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
        resident.dependencyAssessmentDate ? formatShortDate(resident.dependencyAssessmentDate) : '-',
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
        0: { cellWidth: contentWidth * 0.32 },
        1: { cellWidth: contentWidth * 0.09 },
        2: { cellWidth: contentWidth * 0.09 },
        3: { cellWidth: contentWidth * 0.08, halign: 'center' },
        4: { cellWidth: contentWidth * 0.06, halign: 'center' },
        5: { cellWidth: contentWidth * 0.08, halign: 'center' },
        6: { cellWidth: contentWidth * 0.1, halign: 'center' },
        7: { cellWidth: contentWidth * 0.18, halign: 'center' },
      },
      margin: TABLE_MARGIN,
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
    currentY = this.addNutritionalFunctionalSection(report, currentY) + 8
    currentY = this.addTreatmentRoutineSection(report, currentY) + 8
    currentY = this.addGovernanceSection(report, currentY) + 8
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
