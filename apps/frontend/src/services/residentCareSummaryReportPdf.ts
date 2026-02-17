import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ResidentCareSummaryReport } from '@/services/reportsApi'
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
const FOOTER_RAISE_OFFSET = 5

const FONTS = {
  title: 11,
  subtitle: 9.5,
  body: 8.5,
  bodyLarge: 9,
  footer: 7,
}

const COLORS = {
  border: [220, 220, 225] as [number, number, number],
  textPrimary: [30, 30, 40] as [number, number, number],
  textSecondary: [100, 100, 110] as [number, number, number],
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '-'
  return formatDateOnlySafe(dateString)
}

function formatDateTime(dateTime?: string | null): string {
  if (!dateTime) return '-'
  return formatDateTimeSafe(dateTime)
}

function formatNumber(value: number | null, decimals: number = 1): string {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function joinParts(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' • ')
}

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getRoutineRecordLabel(recordType: string): string {
  const labels: Record<string, string> = {
    HIGIENE: 'Higiene',
    ALIMENTACAO: 'Alimentação',
    HIDRATACAO: 'Hidratação',
    MONITORAMENTO: 'Monitoramento',
    ELIMINACAO: 'Eliminação',
    COMPORTAMENTO: 'Comportamento',
    HUMOR: 'Humor',
    SONO: 'Sono',
    PESO: 'Peso/Altura',
    INTERCORRENCIA: 'Intercorrência',
    ATIVIDADES: 'Atividades',
    VISITA: 'Visita',
    OUTROS: 'Outros',
  }
  return labels[recordType] || recordType
}

interface GroupedRoutineSchedule {
  recordType: string
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  dayOfWeek: number | null
  dayOfMonth: number | null
  items: Array<{
    suggestedTimes: string[]
    mealType: string | null
  }>
}

function groupRoutineSchedules(
  routines: ResidentCareSummaryReport['routineSchedules'],
): GroupedRoutineSchedule[] {
  const map = new Map<string, GroupedRoutineSchedule>()

  for (const routine of routines) {
    const key = [
      routine.recordType,
      routine.frequency,
      routine.dayOfWeek ?? 'x',
      routine.dayOfMonth ?? 'x',
    ].join('|')

    if (!map.has(key)) {
      map.set(key, {
        recordType: routine.recordType,
        frequency: routine.frequency,
        dayOfWeek: routine.dayOfWeek,
        dayOfMonth: routine.dayOfMonth,
        items: [],
      })
    }

    map.get(key)!.items.push({
      suggestedTimes: [...routine.suggestedTimes].sort((a, b) => a.localeCompare(b)),
      mealType: routine.mealType,
    })
  }

  return Array.from(map.values()).sort((a, b) => {
    const frequencyOrder = { DAILY: 0, WEEKLY: 1, MONTHLY: 2 }
    const byFrequency = frequencyOrder[a.frequency] - frequencyOrder[b.frequency]
    if (byFrequency !== 0) return byFrequency
    const aTime = a.items[0]?.suggestedTimes[0] || '99:99'
    const bTime = b.items[0]?.suggestedTimes[0] || '99:99'
    return aTime.localeCompare(bTime)
  })
}

class ResidentCareSummaryReportPDFGenerator {
  private doc: jsPDF
  private options: PDFGenerationOptions
  private totalPages = 0
  private y = HEADER_HEIGHT + 8

  constructor(options: PDFGenerationOptions) {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
    this.options = options
  }

  private get pageWidth() {
    return this.doc.internal.pageSize.getWidth()
  }

  private get pageHeight() {
    return this.doc.internal.pageSize.getHeight()
  }

  private get contentBottomLimit() {
    return this.pageHeight - FOOTER_HEIGHT - 5
  }

  private ensureSpace(heightNeeded: number) {
    if (this.y + heightNeeded <= this.contentBottomLimit) return
    this.doc.addPage()
    this.y = HEADER_HEIGHT + 8
  }

  private addHeader() {
    const reportTitle = 'Resumo Assistencial do Residente'
    const subtitleText = `Documento consolidado para consulta institucional - ${this.options.printDateTime}.`
    const systemInfo = 'Documento gerado automaticamente pelo Rafa ILPI'

    this.doc.setFontSize(FONTS.title)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(this.options.ilpiName, PAGE_MARGIN, PAGE_MARGIN)

    this.doc.setFontSize(FONTS.body)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`CNPJ: ${this.options.cnpj}`, PAGE_MARGIN, PAGE_MARGIN + 5)

    this.doc.setFontSize(FONTS.title)
    this.doc.setFont('helvetica', 'bold')
    const titleWidth = this.doc.getTextWidth(reportTitle)
    this.doc.text(reportTitle, (this.pageWidth - titleWidth) / 2, PAGE_MARGIN + 10)

    this.doc.setFontSize(FONTS.subtitle)
    this.doc.setFont('helvetica', 'normal')
    const subtitleWidth = this.doc.getTextWidth(subtitleText)
    this.doc.text(subtitleText, (this.pageWidth - subtitleWidth) / 2, PAGE_MARGIN + 15)

    this.doc.setFontSize(FONTS.body)
    const infoWidth = this.doc.getTextWidth(systemInfo)
    this.doc.text(systemInfo, this.pageWidth - PAGE_MARGIN - infoWidth, PAGE_MARGIN)

    this.doc.setLineWidth(0.5)
    this.doc.setDrawColor(...COLORS.border)
    this.doc.line(PAGE_MARGIN, HEADER_HEIGHT + 2, this.pageWidth - PAGE_MARGIN, HEADER_HEIGHT + 2)
  }

  private addFooter(pageNumber: number) {
    const footerY = this.pageHeight - FOOTER_HEIGHT - FOOTER_RAISE_OFFSET
    this.doc.setLineWidth(0.5)
    this.doc.setDrawColor(...COLORS.border)
    this.doc.line(PAGE_MARGIN, footerY, this.pageWidth - PAGE_MARGIN, footerY)

    this.doc.setFontSize(FONTS.footer)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...COLORS.textSecondary)
    const footerText = `Impresso por ${this.options.userName} em ${this.options.printDateTime}`
    this.doc.text(footerText, PAGE_MARGIN, footerY + 5)

    const pageInfo = `Página ${pageNumber} de ${this.totalPages}`
    const pageInfoWidth = this.doc.getTextWidth(pageInfo)
    this.doc.text(pageInfo, this.pageWidth - PAGE_MARGIN - pageInfoWidth, footerY + 5)

    const legalText =
      'Este documento consolida as principais informações assistenciais do residente na data de sua emissão.'
    this.doc.text(legalText, PAGE_MARGIN, footerY + 9)
  }

  private drawPageDecorations(pageNumber: number) {
    this.addHeader()
    this.addFooter(pageNumber)
  }

  private addSeparator() {
    this.ensureSpace(6)
    this.doc.setLineWidth(0.4)
    this.doc.setDrawColor(...COLORS.border)
    this.doc.line(PAGE_MARGIN, this.y, this.pageWidth - PAGE_MARGIN, this.y)
    this.y += 6
  }

  private addLabelAndText(label: string, text: string) {
    this.ensureSpace(5)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.text(label, PAGE_MARGIN, this.y)
    this.y += 4.5
    this.addParagraph(text)
  }

  private addDataTable(title: string, rows: Array<[string, string]>) {
    this.ensureSpace(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.text(title, PAGE_MARGIN, this.y)

    autoTable(this.doc, {
      startY: this.y + 2,
      head: [['Campo', 'Valor']],
      body: rows,
      theme: 'grid',
      styles: {
        fontSize: FONTS.body,
        cellPadding: 2,
        lineColor: COLORS.border,
        lineWidth: 0.1,
      },
      headStyles: {
        fontStyle: 'bold',
        fillColor: [245, 245, 248],
        textColor: COLORS.textPrimary,
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: this.pageWidth - PAGE_MARGIN * 2 - 55 },
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: HEADER_HEIGHT + 5, bottom: FOOTER_HEIGHT + 5 },
      rowPageBreak: 'avoid',
    })

    const withLastTable = this.doc as jsPDF & { lastAutoTable?: { finalY: number } }
    this.y = (withLastTable.lastAutoTable?.finalY || this.y + 8) + 3
  }

  private addAnthropometryTable(values: [string, string, string, string]) {
    this.ensureSpace(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.text('Medidas Antropométricas', PAGE_MARGIN, this.y)

    autoTable(this.doc, {
      startY: this.y + 2,
      head: [['Altura', 'Peso', 'IMC', 'Registro']],
      body: [values],
      theme: 'grid',
      styles: {
        fontSize: FONTS.body,
        cellPadding: 2,
        lineColor: COLORS.border,
        lineWidth: 0.1,
      },
      headStyles: {
        fontStyle: 'bold',
        fillColor: [245, 245, 248],
        textColor: COLORS.textPrimary,
      },
      tableWidth: this.pageWidth - PAGE_MARGIN * 2,
      columnStyles: {
        // Mesma proporção da tela: 18% | 18% | 14% | 50%
        0: { cellWidth: (this.pageWidth - PAGE_MARGIN * 2) * 0.18 },
        1: { cellWidth: (this.pageWidth - PAGE_MARGIN * 2) * 0.18 },
        2: { cellWidth: (this.pageWidth - PAGE_MARGIN * 2) * 0.14 },
        3: { cellWidth: (this.pageWidth - PAGE_MARGIN * 2) * 0.5 },
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: HEADER_HEIGHT + 5, bottom: FOOTER_HEIGHT + 5 },
      rowPageBreak: 'avoid',
    })

    const withLastTable = this.doc as jsPDF & { lastAutoTable?: { finalY: number } }
    this.y = (withLastTable.lastAutoTable?.finalY || this.y + 8) + 3
  }

  private addVitalSignsTable(values: [string, string, string, string, string, string]) {
    this.ensureSpace(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.text('Sinais Vitais', PAGE_MARGIN, this.y)

    autoTable(this.doc, {
      startY: this.y + 2,
      head: [['Pressão Arterial', 'FC', 'SpO2', 'Temperatura', 'Glicemia', 'Registro']],
      body: [values],
      theme: 'grid',
      styles: {
        fontSize: FONTS.body,
        cellPadding: 2,
        lineColor: COLORS.border,
        lineWidth: 0.1,
      },
      headStyles: {
        fontStyle: 'bold',
        fillColor: [245, 245, 248],
        textColor: COLORS.textPrimary,
      },
      tableWidth: this.pageWidth - PAGE_MARGIN * 2,
      columnStyles: {
        // Mesma proporção da tela: 19% | 10% | 9% | 13% | 14% | 35%
        0: { cellWidth: (this.pageWidth - PAGE_MARGIN * 2) * 0.19 },
        1: { cellWidth: (this.pageWidth - PAGE_MARGIN * 2) * 0.1 },
        2: { cellWidth: (this.pageWidth - PAGE_MARGIN * 2) * 0.09 },
        3: { cellWidth: (this.pageWidth - PAGE_MARGIN * 2) * 0.13 },
        4: { cellWidth: (this.pageWidth - PAGE_MARGIN * 2) * 0.14 },
        5: { cellWidth: (this.pageWidth - PAGE_MARGIN * 2) * 0.35 },
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: HEADER_HEIGHT + 5, bottom: FOOTER_HEIGHT + 5 },
      rowPageBreak: 'avoid',
    })

    const withLastTable = this.doc as jsPDF & { lastAutoTable?: { finalY: number } }
    this.y = (withLastTable.lastAutoTable?.finalY || this.y + 8) + 3
  }

  private addParagraph(text: string) {
    const safeText = text?.trim() ? text : 'Não informado'
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(FONTS.bodyLarge)
    const lines = this.doc.splitTextToSize(safeText, this.pageWidth - PAGE_MARGIN * 2)
    const lineHeight = 4.8

    lines.forEach((line: string) => {
      this.ensureSpace(lineHeight)
      this.doc.text(line, PAGE_MARGIN, this.y)
      this.y += lineHeight
    })
    this.y += 1.5
  }

  private addLine(text: string) {
    this.ensureSpace(4.8)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.text(text || 'Não informado', PAGE_MARGIN, this.y)
    this.y += 4.8
  }

  public generate(report: ResidentCareSummaryReport): jsPDF {
    const residentIdentityLine = joinParts([
      report.resident.cns ? `CNS ${report.resident.cns}` : null,
      report.resident.cpf ? `CPF ${report.resident.cpf}` : null,
    ])

    const admissionLine = joinParts([
      `Admitido em ${formatDate(report.resident.admissionDate)}`,
      report.resident.bedCode ? `Leito ${report.resident.bedCode}` : null,
    ])

    const legalGuardianLine = report.legalGuardian
      ? joinParts([
          report.legalGuardian.name,
          report.legalGuardian.phone,
          report.legalGuardian.email,
          report.legalGuardian.relationship,
        ])
      : 'Não informado'

    const emergencyLines = report.emergencyContacts.length > 0
      ? report.emergencyContacts.map((contact) => joinParts([contact.name, contact.phone, contact.relationship]))
      : ['Não informado']

    const healthInsuranceLine = report.healthInsurances.length > 0
      ? report.healthInsurances
          .map((insurance) => joinParts([insurance.name, insurance.planNumber ? `Nº ${insurance.planNumber}` : null]))
          .join(' | ')
      : 'Não informado'

    const anthropometryLine = report.anthropometry
      ? joinParts([
          report.anthropometry.height !== null ? `Altura ${formatNumber(report.anthropometry.height, 2)} m` : null,
          report.anthropometry.weight !== null ? `Peso ${formatNumber(report.anthropometry.weight, 1)} kg` : null,
          report.anthropometry.bmi !== null ? `IMC ${formatNumber(report.anthropometry.bmi, 1)}` : null,
          report.anthropometry.recordedAt ? `Registro ${formatDateTime(report.anthropometry.recordedAt)}` : null,
        ]) || 'Não informado'
      : 'Não informado'

    const vitalSignsLine = report.vitalSigns
      ? joinParts([
          report.vitalSigns.systolicPressure !== null && report.vitalSigns.diastolicPressure !== null
            ? `PA ${report.vitalSigns.systolicPressure}/${report.vitalSigns.diastolicPressure}`
            : null,
          report.vitalSigns.heartRate !== null ? `FC ${report.vitalSigns.heartRate} bpm` : null,
          report.vitalSigns.oxygenSaturation !== null ? `SpO2 ${report.vitalSigns.oxygenSaturation}%` : null,
          report.vitalSigns.temperature !== null ? `Temp ${formatNumber(report.vitalSigns.temperature, 1)}°C` : null,
          report.vitalSigns.bloodGlucose !== null ? `Glicemia ${report.vitalSigns.bloodGlucose} mg/dL` : null,
          report.vitalSigns.recordedAt ? `Registro ${formatDateTime(report.vitalSigns.recordedAt)}` : null,
        ]) || 'Não informado'
      : 'Não informado'

    const dependencyLine = report.dependencyAssessment
      ? joinParts([
          report.dependencyAssessment.level,
          `Data da Avaliação ${formatDate(report.dependencyAssessment.assessmentDate)}`,
        ])
      : 'Não informado'

    const chronicConditionsText = report.chronicConditions.length > 0
      ? report.chronicConditions
          .map((condition) =>
            joinParts([
              condition.name,
              condition.details ? `Detalhes: ${condition.details}` : null,
              condition.contraindications ? `Contraindicações: ${condition.contraindications}` : null,
            ]),
          )
          .join('\n')
      : 'Não informado'

    const allergiesText = report.allergies.length > 0
      ? report.allergies
          .map((allergy) =>
            joinParts([
              allergy.allergen,
              allergy.severity,
              allergy.reaction ? `Reação: ${allergy.reaction}` : null,
              allergy.contraindications ? `Contraindicações: ${allergy.contraindications}` : null,
            ]),
          )
          .join('\n')
      : 'Não informado'

    const dietaryRestrictionsText = report.dietaryRestrictions.length > 0
      ? report.dietaryRestrictions
          .map((restriction) =>
            joinParts([
              restriction.restriction,
              restriction.type,
              restriction.notes ? `Observações: ${restriction.notes}` : null,
              restriction.contraindications ? `Contraindicações: ${restriction.contraindications}` : null,
            ]),
          )
          .join('\n')
      : 'Não informado'

    const vaccinationsText = report.vaccinations.length > 0
      ? report.vaccinations
          .map((vaccination) =>
            `${joinParts([vaccination.vaccineName, vaccination.doseNumber])}\n${joinParts([
              formatDate(vaccination.applicationDate),
              vaccination.manufacturer,
              vaccination.batchNumber ? `Lote: ${vaccination.batchNumber}` : null,
              vaccination.applicationLocation,
            ])}`,
          )
          .join('\n')
      : 'Não informado'

    const medicationsText = report.medications.length > 0
      ? report.medications
          .map((medication) =>
            joinParts([
              medication.name,
              medication.dosage,
              medication.route,
              medication.schedules.length > 0 ? `Horários: ${medication.schedules.join(', ')}` : null,
            ]),
          )
          .join('\n')
      : 'Não informado'

    const groupedRoutineSchedules = groupRoutineSchedules(report.routineSchedules || [])
    const routineSchedulesText = groupedRoutineSchedules.length > 0
      ? groupedRoutineSchedules
          .map((group) => {
            const label = getRoutineRecordLabel(group.recordType)

            let timesText = ''
            if (group.recordType === 'ALIMENTACAO') {
              timesText = group.items
                .map((item) => `${item.mealType || 'Refeição'}: ${item.suggestedTimes[0] || '-'}`)
                .join(' • ')
            } else {
              timesText = group.items.flatMap((item) => item.suggestedTimes).join(', ')
            }

            const periodParts: string[] = []
            if (group.frequency === 'WEEKLY' && group.dayOfWeek !== null) {
              periodParts.push(WEEKDAY_SHORT[group.dayOfWeek] || `Dia ${group.dayOfWeek}`)
            }
            if (group.frequency === 'MONTHLY' && group.dayOfMonth !== null) {
              periodParts.push(`Dia ${group.dayOfMonth}`)
            }

            const frequencyLabel =
              group.frequency === 'WEEKLY'
                ? 'Semanal'
                : group.frequency === 'MONTHLY'
                  ? 'Mensal'
                  : null

            return joinParts([
              label,
              frequencyLabel,
              periodParts.join(' • ') || null,
              timesText || null,
            ])
          })
          .join('\n')
      : 'Não informado'

    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(13)
    this.doc.text(report.resident.fullName, PAGE_MARGIN, this.y)
    this.y += 5.5

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(FONTS.bodyLarge)
    this.addLine(`Data de nascimento ${formatDate(report.resident.birthDate)} • ${report.resident.age} anos`)
    if (residentIdentityLine) this.addLine(residentIdentityLine)
    this.y += 1
    this.addLine(admissionLine)

    this.addSeparator()
    this.addLabelAndText('Responsável Legal', legalGuardianLine)
    this.addLabelAndText('Contatos de Emergência', emergencyLines.join('\n'))
    this.addLabelAndText('Convênios', healthInsuranceLine)

    this.addSeparator()
    this.addLabelAndText('Tipo Sanguíneo', report.bloodType?.formatted || 'Não informado')
    const anthropometryTableValues: [string, string, string, string] = report.anthropometry
      ? [
          report.anthropometry.height !== null ? `${formatNumber(report.anthropometry.height, 2)} m` : '-',
          report.anthropometry.weight !== null ? `${formatNumber(report.anthropometry.weight, 1)} kg` : '-',
          report.anthropometry.bmi !== null ? formatNumber(report.anthropometry.bmi, 1) : '-',
          report.anthropometry.recordedAt ? formatDateTime(report.anthropometry.recordedAt) : '-',
        ]
      : ['-', '-', '-', anthropometryLine || '-']

    const vitalSignsTableValues: [string, string, string, string, string, string] = report.vitalSigns
      ? [
          report.vitalSigns.systolicPressure !== null && report.vitalSigns.diastolicPressure !== null
            ? `${report.vitalSigns.systolicPressure}/${report.vitalSigns.diastolicPressure}`
            : '-',
          report.vitalSigns.heartRate !== null ? `${report.vitalSigns.heartRate} bpm` : '-',
          report.vitalSigns.oxygenSaturation !== null ? `${report.vitalSigns.oxygenSaturation}%` : '-',
          report.vitalSigns.temperature !== null ? `${formatNumber(report.vitalSigns.temperature, 1)}°C` : '-',
          report.vitalSigns.bloodGlucose !== null ? `${report.vitalSigns.bloodGlucose} mg/dL` : '-',
          report.vitalSigns.recordedAt ? formatDateTime(report.vitalSigns.recordedAt) : '-',
        ]
      : ['-', '-', '-', '-', '-', vitalSignsLine || '-']

    this.addAnthropometryTable(anthropometryTableValues)
    this.addVitalSignsTable(vitalSignsTableValues)
    this.addLabelAndText('Estado de Saúde', report.clinicalProfile?.healthStatus || 'Não informado')
    this.addLabelAndText('Necessidades Especiais', report.clinicalProfile?.specialNeeds || 'Não informado')
    const independenceLine = report.clinicalProfile?.independenceLevel
      ? `Independência: ${report.clinicalProfile.independenceLevel}`
      : null
    const aspectsLine = report.clinicalProfile?.functionalAspects || null
    const functionalText = independenceLine && aspectsLine
      ? `${independenceLine}\n${aspectsLine}`
      : (independenceLine || aspectsLine || 'Não informado')
    this.addLabelAndText('Aspectos Funcionais', functionalText || 'Não informado')
    this.addLabelAndText('Grau de dependência', dependencyLine)
    this.addLabelAndText('Condições Crônicas', chronicConditionsText)
    this.addLabelAndText('Alergias', allergiesText)
    this.addLabelAndText('Restrições Alimentares', dietaryRestrictionsText)
    this.addLabelAndText('Imunizações', vaccinationsText)
    this.addLabelAndText('Medicamentos em uso', medicationsText)
    this.addLabelAndText('Programação da Rotina', routineSchedulesText)

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
}

export function generateResidentCareSummaryReportPDF(
  report: ResidentCareSummaryReport,
  options: PDFGenerationOptions,
): jsPDF {
  const generator = new ResidentCareSummaryReportPDFGenerator(options)
  return generator.generate(report)
}

export function downloadResidentCareSummaryReportPDF(
  report: ResidentCareSummaryReport,
  options: PDFGenerationOptions,
  filename?: string,
) {
  const generator = new ResidentCareSummaryReportPDFGenerator(options)
  generator.generate(report)
  const today = new Date().toISOString().split('T')[0]
  const defaultFilename = `resumo-assistencial-${report.resident.fullName.toLowerCase().replace(/\s+/g, '-')}-${today}.pdf`
  generator.save(filename || defaultFilename)
}
