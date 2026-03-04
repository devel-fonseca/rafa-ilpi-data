/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Resident } from '@/api/residents.api'
import type { ResidentDocument } from '@/api/resident-documents.api'
import { RESIDENT_DOCUMENT_TYPES } from '@/api/resident-documents.api'
import {
  calculateAge,
  formatAddress,
  formatBedFromResident,
  formatCNS,
  formatCPF,
  formatDate,
  formatDateTime,
  formatPhone,
  formatRG,
  translateEnum,
} from '@/utils/formatters'

interface PDFGenerationOptions {
  ilpiName: string
  cnpj: string
  cnes?: string
  userName: string
  printDate: string
  printDateTime: string
}

interface ResidentRegistrationReportPayload {
  resident: Resident
  documents?: ResidentDocument[]
}

interface DocumentOrderRule {
  type: string
  label: string
  indicateMissing: boolean
}

interface DocumentDisplayRow {
  typeLabel: string
  details: string | null
  createdAt: string | null
  isMissing: boolean
}

const PAGE_MARGIN = 15
const HEADER_HEIGHT = 30
const FOOTER_HEIGHT = 20

const FONTS = {
  title: 11,
  subtitle: 9.5,
  body: 8.5,
  bodyLarge: 9,
  footer: 7,
}

const COLORS = {
  headerBg: [245, 245, 248] as [number, number, number],
  zebraEven: [250, 250, 252] as [number, number, number],
  border: [220, 220, 225] as [number, number, number],
  textPrimary: [30, 30, 40] as [number, number, number],
  textSecondary: [100, 100, 110] as [number, number, number],
}

const DOCUMENT_TYPE_LABELS = Object.fromEntries(
  RESIDENT_DOCUMENT_TYPES.map((item) => [item.value, item.label]),
) as Record<string, string>

const DOCUMENT_ORDER_RULES: DocumentOrderRule[] = [
  { type: 'TERMO_ADMISSAO', label: 'Termo de admissão do residente', indicateMissing: true },
  {
    type: 'TERMO_CONSENTIMENTO_IMAGEM',
    label: 'Termo de consentimento de imagem',
    indicateMissing: true,
  },
  {
    type: 'TERMO_CONSENTIMENTO_LGPD',
    label: 'Termo de consentimento LGPD',
    indicateMissing: true,
  },
  {
    type: 'DOCUMENTOS_PESSOAIS',
    label: 'Documentos pessoais do residente',
    indicateMissing: true,
  },
  {
    type: 'COMPROVANTE_RESIDENCIA_RESIDENTE',
    label: 'Comprovante de residência do residente',
    indicateMissing: false,
  },
  {
    type: 'DOCUMENTOS_RESPONSAVEL_LEGAL',
    label: 'Documentos do responsável legal',
    indicateMissing: true,
  },
  {
    type: 'COMPROVANTE_RESIDENCIA_RESPONSAVEL',
    label: 'Comprovante de residência do responsável legal',
    indicateMissing: false,
  },
  { type: 'CARTAO_CONVENIO', label: 'Cartão do convênio', indicateMissing: false },
  { type: 'LAUDO_MEDICO', label: 'Laudo médico do residente', indicateMissing: true },
  { type: 'PRESCRICAO_MEDICA', label: 'Prescrição médica', indicateMissing: false },
  { type: 'COMPROVANTE_VACINACAO', label: 'Comprovante de vacinação', indicateMissing: false },
]

function valueOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function formatAddressInline(
  street: string | null | undefined,
  number: string | null | undefined,
  complement: string | null | undefined,
  district: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined,
  zipCode: string | null | undefined,
): string {
  const address = formatAddress(street, number, complement, district, city, state, zipCode)
  return address.replace(/\n/g, ' • ')
}

function getDocumentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type] || type
}

function formatResidentStatus(status: string | null | undefined): string {
  if (!status?.trim()) return '-'

  const normalized = status.trim().toUpperCase()
  const knownStatuses: Record<string, string> = {
    ATIVO: 'Ativo',
    ACTIVE: 'Ativo',
    INATIVO: 'Inativo',
    INACTIVE: 'Inativo',
    FALECIDO: 'Falecido',
    DECEASED: 'Falecido',
  }

  return knownStatuses[normalized] || status
}

function buildOrderedDocumentRows(documents: ResidentDocument[]): DocumentDisplayRow[] {
  const sortedByDateDesc = [...documents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const rows: DocumentDisplayRow[] = []
  const consumedIds = new Set<string>()

  DOCUMENT_ORDER_RULES.forEach((rule) => {
    const docsOfType = sortedByDateDesc.filter((doc) => doc.type === rule.type)

    if (docsOfType.length === 0) {
      if (rule.indicateMissing) {
        rows.push({
          typeLabel: rule.label,
          details: null,
          createdAt: null,
          isMissing: true,
        })
      }
      return
    }

    docsOfType.forEach((doc) => {
      consumedIds.add(doc.id)
      rows.push({
        typeLabel: rule.label,
        details: doc.details,
        createdAt: doc.createdAt,
        isMissing: false,
      })
    })
  })

  const otherDocuments = sortedByDateDesc
    .filter((doc) => !consumedIds.has(doc.id))
    .sort((a, b) => {
      const typeDiff = getDocumentTypeLabel(a.type).localeCompare(getDocumentTypeLabel(b.type), 'pt-BR')
      if (typeDiff !== 0) return typeDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  otherDocuments.forEach((doc) => {
    rows.push({
      typeLabel: `Outros documentos (${getDocumentTypeLabel(doc.type)})`,
      details: doc.details,
      createdAt: doc.createdAt,
      isMissing: false,
    })
  })

  return rows
}

class ResidentRegistrationReportPDFGenerator {
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

  private addHeader(residentName: string, residentStatus: string) {
    const reportTitle = 'Cadastro do Residente'

    this.doc.setFontSize(FONTS.title)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(this.options.ilpiName, PAGE_MARGIN, PAGE_MARGIN)

    this.doc.setFontSize(FONTS.body)
    this.doc.setFont('helvetica', 'normal')
    const institutionIds = this.options.cnes
      ? `CNPJ: ${this.options.cnpj} • CNES: ${this.options.cnes}`
      : `CNPJ: ${this.options.cnpj}`
    this.doc.text(institutionIds, PAGE_MARGIN, PAGE_MARGIN + 5)

    this.doc.setFontSize(FONTS.title)
    this.doc.setFont('helvetica', 'bold')
    const titleWidth = this.doc.getTextWidth(reportTitle)
    this.doc.text(reportTitle, (this.pageWidth - titleWidth) / 2, PAGE_MARGIN + 10)

    this.doc.setFontSize(FONTS.subtitle)
    this.doc.setFont('helvetica', 'normal')
    const residentLine = `${residentName} • ${formatResidentStatus(residentStatus)}`
    const residentLineWidth = this.doc.getTextWidth(residentLine)
    this.doc.text(residentLine, (this.pageWidth - residentLineWidth) / 2, PAGE_MARGIN + 15)

    this.doc.setLineWidth(0.5)
    this.doc.setDrawColor(...COLORS.border)
    this.doc.line(PAGE_MARGIN, HEADER_HEIGHT + 2, this.pageWidth - PAGE_MARGIN, HEADER_HEIGHT + 2)
  }

  private addFooter(pageNumber: number) {
    const footerY = this.pageHeight - FOOTER_HEIGHT

    this.doc.setLineWidth(0.5)
    this.doc.setDrawColor(...COLORS.border)
    this.doc.line(PAGE_MARGIN, footerY, this.pageWidth - PAGE_MARGIN, footerY)

    this.doc.setFontSize(FONTS.footer)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...COLORS.textSecondary)

    const legalText =
      'Este documento consolida os dados cadastrais completos do residente na data de sua emissão.'
    this.doc.setFont('helvetica', 'bolditalic')
    this.doc.text(legalText, PAGE_MARGIN, footerY + 5)

    this.doc.setFont('helvetica', 'normal')
    const footerText = `Impresso por ${this.options.userName} em ${this.options.printDateTime}`
    this.doc.text(footerText, PAGE_MARGIN, footerY + 9)

    const pageInfo = `Página ${pageNumber} de ${this.totalPages}`
    const pageInfoWidth = this.doc.getTextWidth(pageInfo)
    this.doc.text(pageInfo, this.pageWidth - PAGE_MARGIN - pageInfoWidth, footerY + 9)

    const systemInfo = 'Documento gerado automaticamente pelo Rafa ILPI • Versão do relatório: 1.0'
    const systemInfoWidth = this.doc.getTextWidth(systemInfo)
    this.doc.text(systemInfo, (this.pageWidth - systemInfoWidth) / 2, footerY + 13)
  }

  private drawPageDecorations(pageNumber: number, residentName: string, residentStatus: string) {
    this.addHeader(residentName, residentStatus)
    this.addFooter(pageNumber)
  }

  private addSectionTitle(title: string) {
    this.ensureSpace(8)
    this.doc.setFontSize(FONTS.bodyLarge)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.textPrimary)
    this.doc.text(title, PAGE_MARGIN, this.y)
    this.y += 4
  }

  private addKeyValueTable(rows: Array<[string, string]>) {
    autoTable(this.doc, {
      startY: this.y,
      head: [],
      body: rows,
      theme: 'grid',
      styles: {
        fontSize: FONTS.body,
        cellPadding: 2,
        lineColor: COLORS.border,
        lineWidth: 0.1,
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 62, fontStyle: 'bold' },
        1: { cellWidth: this.pageWidth - PAGE_MARGIN * 2 - 62 },
      },
      margin: {
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
        top: HEADER_HEIGHT + 5,
        bottom: FOOTER_HEIGHT + 5,
      },
      rowPageBreak: 'avoid',
      alternateRowStyles: {
        fillColor: COLORS.zebraEven,
      },
      didDrawPage: undefined,
    })

    this.y = (this.doc as any).lastAutoTable.finalY + 5
  }

  private addContactsTable(resident: Resident) {
    this.addSectionTitle('2. CONTATOS DE EMERGÊNCIA')
    if (!resident.emergencyContacts || resident.emergencyContacts.length === 0) {
      this.addKeyValueTable([['Situação', 'Nenhum contato de emergência cadastrado.']])
      return
    }
    const contentWidth = this.pageWidth - PAGE_MARGIN * 2

    autoTable(this.doc, {
      startY: this.y,
      head: [['Nome', 'Telefone', 'Parentesco']],
      body: resident.emergencyContacts.map((contact) => [
        valueOrDash(contact.name),
        formatPhone(contact.phone),
        valueOrDash(contact.relationship),
      ]),
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
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.5 },
        1: { cellWidth: contentWidth * 0.25 },
        2: { cellWidth: contentWidth * 0.25 },
      },
      margin: {
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
        top: HEADER_HEIGHT + 5,
        bottom: FOOTER_HEIGHT + 5,
      },
      rowPageBreak: 'avoid',
      alternateRowStyles: { fillColor: COLORS.zebraEven },
      didDrawPage: undefined,
    })

    this.y = (this.doc as any).lastAutoTable.finalY + 5
  }

  private addHealthPlansTable(resident: Resident) {
    this.addSectionTitle('5. CONVÊNIOS E PLANOS DE SAÚDE')
    if (!resident.healthPlans || resident.healthPlans.length === 0) {
      this.addKeyValueTable([['Situação', 'Nenhum convênio cadastrado.']])
      return
    }

    autoTable(this.doc, {
      startY: this.y,
      head: [['Convênio', 'Número da carteirinha']],
      body: resident.healthPlans.map((plan) => [
        valueOrDash(plan.name),
        valueOrDash(plan.cardNumber),
      ]),
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
      },
      columnStyles: {
        0: { cellWidth: this.pageWidth * 0.5 - PAGE_MARGIN },
        1: { cellWidth: this.pageWidth * 0.4 - PAGE_MARGIN },
      },
      margin: {
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
        top: HEADER_HEIGHT + 5,
        bottom: FOOTER_HEIGHT + 5,
      },
      rowPageBreak: 'avoid',
      alternateRowStyles: { fillColor: COLORS.zebraEven },
      didDrawPage: undefined,
    })

    this.y = (this.doc as any).lastAutoTable.finalY + 5
  }

  private addDocumentsTable(documents: ResidentDocument[]) {
    this.addSectionTitle('7. DOCUMENTOS DO CADASTRO')
    const rows = buildOrderedDocumentRows(documents)
    if (rows.length === 0) {
      this.addKeyValueTable([['Situação', 'Nenhum documento anexado ao cadastro.']])
      return
    }
    const contentWidth = this.pageWidth - PAGE_MARGIN * 2

    autoTable(this.doc, {
      startY: this.y,
      head: [['Tipo', 'Detalhes', 'Data de envio']],
      body: rows.map((row) => [
        row.typeLabel,
        valueOrDash(row.details),
        row.createdAt ? formatDateTime(row.createdAt) : 'Ausente',
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
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.36 },
        1: { cellWidth: contentWidth * 0.40 },
        2: { cellWidth: contentWidth * 0.24 },
      },
      margin: {
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
        top: HEADER_HEIGHT + 5,
        bottom: FOOTER_HEIGHT + 5,
      },
      rowPageBreak: 'avoid',
      alternateRowStyles: { fillColor: COLORS.zebraEven },
      didParseCell: (data) => {
        const row = rows[data.row.index]
        if (!row || !row.isMissing) return
        if (data.column.index === 2) {
          data.cell.styles.textColor = [195, 96, 0]
          data.cell.styles.fontStyle = 'bold'
        }
      },
      didDrawPage: undefined,
    })

    this.y = (this.doc as any).lastAutoTable.finalY + 5
  }

  public generate(payload: ResidentRegistrationReportPayload): jsPDF {
    const { resident, documents = [] } = payload
    this.y = HEADER_HEIGHT + 8

    this.addSectionTitle('1. IDENTIFICAÇÃO E DADOS PESSOAIS')
    this.addKeyValueTable([
      ['Nome completo', resident.fullName],
      ['Nome social', valueOrDash(resident.socialName)],
      ['Data de nascimento', formatDate(resident.birthDate)],
      ['Idade', calculateAge(resident.birthDate)],
      ['CPF', formatCPF(resident.cpf)],
      ['CNS', formatCNS(resident.cns)],
      ['RG', formatRG(resident.rg, resident.rgIssuer)],
      ['Gênero', translateEnum.gender(resident.gender)],
      ['Estado civil', translateEnum.estadoCivil(resident.civilStatus)],
      ['Escolaridade', translateEnum.escolaridade(resident.education)],
      ['Profissão', valueOrDash(resident.profession)],
      ['Religião', valueOrDash(resident.religion)],
      ['Nacionalidade', valueOrDash(resident.nationality)],
      [
        'Local de nascimento',
        valueOrDash(
          [resident.birthCity, resident.birthState]
            .filter((part) => Boolean(part && part.trim()))
            .join('/'),
        ),
      ],
      ['Nome da mãe', valueOrDash(resident.motherName)],
      ['Nome do pai', valueOrDash(resident.fatherName)],
    ])

    this.addContactsTable(resident)

    this.addSectionTitle('3. ENDEREÇO E PROCEDÊNCIA')
    this.addKeyValueTable([
      [
        'Endereço atual',
        formatAddressInline(
          resident.currentStreet,
          resident.currentNumber,
          resident.currentComplement,
          resident.currentDistrict,
          resident.currentCity,
          resident.currentState,
          resident.currentCep,
        ),
      ],
      ['E-mail', valueOrDash(resident.email)],
      ['Telefone', formatPhone(resident.currentPhone)],
      ['Procedência', valueOrDash(resident.origin)],
    ])

    this.addSectionTitle('4. RESPONSÁVEL LEGAL')
    this.addKeyValueTable([
      ['Nome', valueOrDash(resident.legalGuardianName)],
      ['Tipo de responsabilidade', valueOrDash(resident.legalGuardianType)],
      ['CPF', formatCPF(resident.legalGuardianCpf)],
      ['RG', formatRG(resident.legalGuardianRg)],
      ['E-mail', valueOrDash(resident.legalGuardianEmail)],
      ['Telefone', formatPhone(resident.legalGuardianPhone)],
      [
        'Endereço',
        formatAddressInline(
          resident.legalGuardianStreet,
          resident.legalGuardianNumber,
          resident.legalGuardianComplement,
          resident.legalGuardianDistrict,
          resident.legalGuardianCity,
          resident.legalGuardianState,
          resident.legalGuardianCep,
        ),
      ],
    ])

    this.addHealthPlansTable(resident)

    this.addSectionTitle('6. ADMISSÃO E ACOMODAÇÃO')
    const admissionRows: Array<[string, string]> = [
      ['Data de admissão', formatDate(resident.admissionDate)],
      ['Tipo de admissão', valueOrDash(resident.admissionType)],
      ['Motivo da admissão', valueOrDash(resident.admissionReason)],
      ['Condições da admissão', valueOrDash(resident.admissionConditions)],
    ]

    if (resident.dischargeDate) {
      admissionRows.push(['Data de desligamento', formatDate(resident.dischargeDate)])
    }

    if (resident.dischargeReason?.trim()) {
      admissionRows.push(['Motivo do desligamento', valueOrDash(resident.dischargeReason)])
    }

    admissionRows.push(['Leito', formatBedFromResident(resident)])

    this.addKeyValueTable(admissionRows)

    this.addDocumentsTable(documents)

    this.totalPages = (this.doc as any).getNumberOfPages()
    for (let page = 1; page <= this.totalPages; page++) {
      this.doc.setPage(page)
      this.drawPageDecorations(page, resident.fullName, resident.status)
    }

    return this.doc
  }
}

function sanitizeFilePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function downloadResidentRegistrationReportPDF(
  payload: ResidentRegistrationReportPayload,
  options: PDFGenerationOptions,
) {
  const generator = new ResidentRegistrationReportPDFGenerator(options)
  const pdf = generator.generate(payload)
  const residentName = sanitizeFilePart(payload.resident.fullName || 'residente')
  const datePart = sanitizeFilePart(options.printDate || 'data')
  const fileName = `cadastro-residente-${residentName}-${datePart}.pdf`
  pdf.save(fileName)
}
