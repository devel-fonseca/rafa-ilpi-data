import jsPDF from 'jspdf'
import { differenceInYears, parseISO } from 'date-fns'
import { formatDateLongSafe, formatDateOnlySafe, getCurrentDateTime, normalizeUTCDate } from '@/utils/dateHelpers'

// ==================== TIPOS ====================

interface DailyRecord {
  id: string
  type: string
  date: Date
  time: string
  data: any
  recordedBy: string
  notes?: string
  resident?: {
    fullName: string
  }
}

interface ResidentData {
  fullName: string
  birthDate: string
  cns?: string
  admissionDate?: string
  emergencyContacts?: Array<{
    name: string
    phone: string
    relationship: string
  }>
  weight?: number
  height?: number
  roomId?: string
  bedId?: string
}

interface TenantData {
  name: string
  addressStreet?: string
  addressNumber?: string
  addressCity?: string
  addressState?: string
}

interface PDFData {
  tenant: TenantData
  resident: ResidentData
  date: string
  records: DailyRecord[]
}

// ==================== CONSTANTES ====================

const PAGE_WIDTH = 210 // A4 em mm
const PAGE_HEIGHT = 297
const MARGIN = 10
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Agrupa registros por tipo
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function groupRecordsByType(records: DailyRecord[]): Record<string, DailyRecord[]> {
  return records.reduce((acc, record) => {
    if (!acc[record.type]) {
      acc[record.type] = []
    }
    acc[record.type].push(record)
    return acc
  }, {} as Record<string, DailyRecord[]>)
}

/**
 * Calcula idade a partir da data de nascimento
 */
function calculateAge(birthDate: string): number {
  try {
    return differenceInYears(new Date(), parseISO(birthDate))
  } catch {
    return 0
  }
}

/**
 * Calcula total de hidratação em ml
 */
function calculateTotalHydration(records: DailyRecord[]): number {
  let total = 0

  // Hidratação direta
  records.filter(r => r.type === 'HIDRATACAO').forEach(r => {
    total += r.data?.volumeMl || 0
  })

  // Hidratação durante alimentação
  records.filter(r => r.type === 'ALIMENTACAO').forEach(r => {
    total += r.data?.volumeMl || 0
  })

  return total
}

/**
 * Calcula percentual total de alimentação (base 600 pontos)
 */
function calculateFoodPercentage(records: DailyRecord[]): number {
  const alimentacaoRecords = records.filter(r => r.type === 'ALIMENTACAO')

  const converteIngestao = (ingeriu: string): number => {
    switch (ingeriu) {
      case '100%': return 100
      case '75%': return 75
      case '50%': return 50
      case '<25%': return 25
      case 'Recusou': return 0
      default: return 0
    }
  }

  const totalIngestao = alimentacaoRecords.reduce(
    (sum, r) => sum + converteIngestao(r.data?.ingeriu || 'Recusou'),
    0
  )

  return Math.round((totalIngestao / 600) * 100)
}

/**
 * Obtém registros de alimentação por refeição
 */
function getMealsByType(records: DailyRecord[]): Record<string, { percentage: string; time: string }> {
  const meals: Record<string, { percentage: string; time: string }> = {
    'Café da Manhã': { percentage: '-', time: '-' },
    'Colação': { percentage: '-', time: '-' },
    'Almoço': { percentage: '-', time: '-' },
    'Lanche': { percentage: '-', time: '-' },
    'Jantar': { percentage: '-', time: '-' },
    'Ceia': { percentage: '-', time: '-' },
  }

  records.filter(r => r.type === 'ALIMENTACAO').forEach(r => {
    const refeicao = r.data?.refeicao
    if (refeicao && meals[refeicao]) {
      meals[refeicao] = {
        percentage: r.data?.ingeriu || '-',
        time: r.time || '-'
      }
    }
  })

  return meals
}

// ==================== FUNÇÕES DE DESENHO ====================

/**
 * Desenha o cabeçalho do PDF
 */
function drawHeader(doc: jsPDF, data: PDFData): number {
  const y = MARGIN

  // Nome da Instituição e Data
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(data.tenant.name || 'ILPI', MARGIN, y + 5)

  doc.setFontSize(12)
  doc.text(
    `Registro Diário - ${formatDateLongSafe(data.date)}`,
    PAGE_WIDTH - MARGIN,
    y + 5,
    { align: 'right' }
  )

  // Nome do Residente (esquerda) e CNS (direita) na mesma linha
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  const idade = calculateAge(data.resident.birthDate)
  doc.text(
    `Residente: ${data.resident.fullName.toUpperCase()} (${idade} anos)`,
    MARGIN,
    y + 12
  )

  // CNS alinhado à direita (com máscara)
  if (data.resident.cns) {
    // Aplicar máscara: XXX XXXX XXXX XXXX
    const cnsFormatted = data.resident.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')
    doc.setFontSize(9)
    doc.text(`CNS: ${cnsFormatted}`, PAGE_WIDTH - MARGIN, y + 12, { align: 'right' })
  }

  // Linha divisória
  doc.setDrawColor(200, 200, 200)
  doc.line(MARGIN, y + 15, PAGE_WIDTH - MARGIN, y + 15)

  // Data de Admissão | Contato de Emergência (sem "Dados:")
  doc.setFontSize(8)
  let infoText = ''

  if (data.resident.admissionDate) {
    try {
      // Aceita tanto ISO string completo quanto apenas YYYY-MM-DD
      const admissionFormatted = formatDateOnlySafe(data.resident.admissionDate)
      infoText += `Admissão: ${admissionFormatted}`
    } catch (error) {
      console.warn('Erro ao formatar data de admissão:', error)
      infoText += `Admissão: ${data.resident.admissionDate}`
    }
  }

  // Contato de emergência (pegar o primeiro)
  if (data.resident.emergencyContacts && data.resident.emergencyContacts.length > 0) {
    const contact = data.resident.emergencyContacts[0]
    if (infoText) infoText += ' | '
    infoText += `Emergência: ${contact.name}, ${contact.phone} (${contact.relationship})`
  }

  if (infoText) {
    doc.text(infoText, MARGIN, y + 20)
  }

  // Linha divisória
  doc.line(MARGIN, y + 23, PAGE_WIDTH - MARGIN, y + 23)

  return y + 28 // Retorna próxima posição Y
}

/**
 * Desenha seção de Alimentação e Hidratação lado a lado
 */
function drawFoodHydration(doc: jsPDF, records: DailyRecord[], startY: number): number {
  const y = startY
  const foodWidth = CONTENT_WIDTH * 0.75 // 75% para alimentação
  const hydrationWidth = CONTENT_WIDTH * 0.25 - 3 // 25% para hidratação

  // Título da seção
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('ALIMENTAÇÃO DO DIA', MARGIN, y)
  doc.text('HIDRATAÇÃO', MARGIN + foodWidth + 3, y)

  // Moldura Alimentação (altura reduzida)
  const sectionHeight = 30
  doc.setDrawColor(150, 150, 150)
  doc.rect(MARGIN, y + 2, foodWidth, sectionHeight)

  // Tabela de Refeições
  const meals = getMealsByType(records)
  const mealNames = Object.keys(meals)
  const cellWidth = foodWidth / 6
  const tableY = y + 3

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')

  // Cabeçalhos
  mealNames.forEach((meal, idx) => {
    const shortName = meal.split(' ')[0] // "Café", "Almoço", etc
    doc.text(shortName, MARGIN + idx * cellWidth + cellWidth / 2, tableY + 2.5, { align: 'center' })
  })

  doc.line(MARGIN, tableY + 4, MARGIN + foodWidth, tableY + 4)

  // Percentuais
  doc.setFont('helvetica', 'normal')
  mealNames.forEach((meal, idx) => {
    const percentage = meals[meal].percentage
    doc.text(percentage, MARGIN + idx * cellWidth + cellWidth / 2, tableY + 8, { align: 'center' })
  })

  doc.line(MARGIN, tableY + 10, MARGIN + foodWidth, tableY + 10)

  // Horários
  doc.setFontSize(5.5)
  mealNames.forEach((meal, idx) => {
    const time = meals[meal].time
    doc.text(time, MARGIN + idx * cellWidth + cellWidth / 2, tableY + 13, { align: 'center' })
  })

  // Percentual total
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  const totalPercentage = calculateFoodPercentage(records)
  doc.text(`Total: ${totalPercentage}%`, MARGIN + 2, tableY + 19)

  // Moldura Hidratação (coluna estreita)
  doc.rect(MARGIN + foodWidth + 3, y + 2, hydrationWidth, sectionHeight)

  // Total de Hidratação
  const totalHydration = calculateTotalHydration(records)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Total:', MARGIN + foodWidth + 5, y + 10, { align: 'left' })
  doc.setFontSize(12)
  doc.text(`${totalHydration}`, MARGIN + foodWidth + hydrationWidth / 2 + 1.5, y + 18, { align: 'center' })
  doc.setFontSize(9)
  doc.text('ml', MARGIN + foodWidth + hydrationWidth / 2 + 1.5, y + 23, { align: 'center' })

  return y + sectionHeight + 7 // Retorna próxima posição Y
}

/**
 * Desenha seção de Monitoramentos Vitais
 */
function drawVitals(doc: jsPDF, records: DailyRecord[], startY: number): number {
  const y = startY
  const vitalsRecords = records.filter(r => r.type === 'MONITORAMENTO')

  if (vitalsRecords.length === 0) {
    return y // Pula seção se não houver registros
  }

  // Título
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('MONITORAMENTOS VITAIS', MARGIN, y)

  // Moldura
  const tableHeight = 8 + vitalsRecords.length * 6
  doc.setDrawColor(150, 150, 150)
  doc.rect(MARGIN, y + 2, CONTENT_WIDTH, tableHeight)

  // Cabeçalhos da tabela
  doc.setFontSize(8)
  const colWidths = [15, 25, 20, 20, 20, 25]
  const headers = ['Hora', 'PA', 'Temp', 'FC', 'SpO2', 'Glicemia']
  let xPos = MARGIN + 2

  headers.forEach((header, idx) => {
    doc.text(header, xPos, y + 7)
    xPos += colWidths[idx]
  })

  doc.line(MARGIN, y + 9, MARGIN + CONTENT_WIDTH, y + 9)

  // Dados
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)

  vitalsRecords.forEach((record, rowIdx) => {
    const rowY = y + 14 + rowIdx * 6
    xPos = MARGIN + 2

    const data = record.data || {}
    const values = [
      record.time || '-',
      data.pressaoArterial || '-',
      data.temperatura ? `${data.temperatura}°C` : '-',
      data.frequenciaCardiaca ? `${data.frequenciaCardiaca}bpm` : '-',
      data.saturacaoO2 ? `${data.saturacaoO2}%` : '-',
      data.glicemia ? `${data.glicemia}mg/dL` : '-',
    ]

    values.forEach((value, idx) => {
      doc.text(value, xPos, rowY)
      xPos += colWidths[idx]
    })
  })

  return y + tableHeight + 7 // Retorna próxima posição Y
}

/**
 * Desenha seção de Higiene e Eliminação lado a lado
 */
function drawHygieneElimination(doc: jsPDF, records: DailyRecord[], startY: number): number {
  const y = startY
  const colWidth = CONTENT_WIDTH / 2

  const higieneRecords = records.filter(r => r.type === 'HIGIENE')
  const eliminacaoRecords = records.filter(r => r.type === 'ELIMINACAO')

  if (higieneRecords.length === 0 && eliminacaoRecords.length === 0) {
    return y // Pula se não houver registros
  }

  // Títulos
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('HIGIENE', MARGIN, y)
  doc.text('ELIMINAÇÃO', MARGIN + colWidth + 5, y)

  // Molduras (altura reduzida)
  doc.setDrawColor(150, 150, 150)
  const cardHeight = 20
  doc.rect(MARGIN, y + 2, colWidth - 5, cardHeight)
  doc.rect(MARGIN + colWidth + 5, y + 2, colWidth - 5, cardHeight)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')

  // Higiene
  let textY = y + 6
  if (higieneRecords.length > 0) {
    higieneRecords.forEach(record => {
      const data = record.data || {}
      if (data.tipoBanho) doc.text(`Banho: ${data.tipoBanho}`, MARGIN + 2, textY)
      textY += 3
      if (data.condicaoPele) doc.text(`Pele: ${data.condicaoPele}`, MARGIN + 2, textY)
      textY += 3
      if (data.higieneBucal !== undefined) doc.text(`Hig.Bucal: ${data.higieneBucal ? 'Sim' : 'Não'}`, MARGIN + 2, textY)
      textY += 3
      if (data.trocaFralda) doc.text(`Fraldas: ${data.quantidadeFraldas || 0}x`, MARGIN + 2, textY)
    })
  } else {
    doc.text('Nenhum registro', MARGIN + 2, textY)
  }

  // Eliminação
  textY = y + 6
  if (eliminacaoRecords.length > 0) {
    const urinaCount = eliminacaoRecords.filter(r => r.data?.tipo === 'Urina').length
    const fezesCount = eliminacaoRecords.filter(r => r.data?.tipo === 'Fezes').length

    doc.text(`Urina: ${urinaCount}x`, MARGIN + colWidth + 7, textY)
    textY += 3
    doc.text(`Fezes: ${fezesCount}x`, MARGIN + colWidth + 7, textY)

    // Observações (limitadas)
    let obsCount = 0
    eliminacaoRecords.forEach(record => {
      if (record.data?.frequencia && obsCount < 2) {
        textY += 3
        doc.setFontSize(6)
        doc.text(`${record.data.tipo}: ${record.data.frequencia}`, MARGIN + colWidth + 7, textY)
        obsCount++
      }
    })
  } else {
    doc.text('Nenhum registro', MARGIN + colWidth + 7, textY)
  }

  return y + cardHeight + 7 // Retorna próxima posição Y
}

/**
 * Desenha seção de Atividades, Comportamento, Visitas e Outros
 */
function drawActivitiesBehavior(doc: jsPDF, records: DailyRecord[], startY: number): number {
  const y = startY

  const atividadesRecords = records.filter(r => r.type === 'ATIVIDADES')
  const comportamentoRecords = records.filter(r => r.type === 'COMPORTAMENTO')
  const visitaRecords = records.filter(r => r.type === 'VISITA')
  const outrosRecords = records.filter(r => r.type === 'OUTROS')

  const totalRecords = atividadesRecords.length + comportamentoRecords.length + visitaRecords.length + outrosRecords.length

  if (totalRecords === 0) {
    return y // Pula se não houver registros
  }

  // Título
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('ATIVIDADES, COMPORTAMENTO, VISITAS & OUTROS', MARGIN, y)

  // Calcular altura dinâmica baseada no número de registros
  const lineHeight = 4
  const sectionHeight = Math.min(Math.max(10, totalRecords * lineHeight + 5), 35) // Min 10mm, Max 35mm

  // Moldura
  doc.setDrawColor(150, 150, 150)
  doc.rect(MARGIN, y + 2, CONTENT_WIDTH, sectionHeight)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')

  let textY = y + 6

  // Atividades
  atividadesRecords.forEach(record => {
    if (textY > y + sectionHeight - 2) return // Evita overflow
    doc.text(`• ${record.time} - ${record.data?.atividade || 'Atividade'}`, MARGIN + 2, textY)
    textY += lineHeight
  })

  // Comportamento
  comportamentoRecords.forEach(record => {
    if (textY > y + sectionHeight - 2) return // Evita overflow
    const desc = record.data?.descricao || 'Comportamento adequado'
    const shortDesc = desc.length > 70 ? desc.substring(0, 70) + '...' : desc
    doc.text(`• ${record.time} - ${shortDesc}`, MARGIN + 2, textY)
    textY += lineHeight
  })

  // Visitas
  visitaRecords.forEach(record => {
    if (textY > y + sectionHeight - 2) return // Evita overflow
    doc.text(`• ${record.time} - Visita: ${record.data?.visitante || 'Visitante'}`, MARGIN + 2, textY)
    textY += lineHeight
  })

  // Outros
  outrosRecords.forEach(record => {
    if (textY > y + sectionHeight - 2) return // Evita overflow
    const desc = record.data?.descricao || 'Outros'
    const shortDesc = desc.length > 70 ? desc.substring(0, 70) + '...' : desc
    doc.text(`• ${record.time} - ${shortDesc}`, MARGIN + 2, textY)
    textY += lineHeight
  })

  return y + sectionHeight + 7 // Retorna próxima posição Y
}

/**
 * Desenha seção de Intercorrências
 */
function drawIncidents(doc: jsPDF, records: DailyRecord[], startY: number): number {
  const y = startY

  const intercorrenciaRecords = records.filter(r => r.type === 'INTERCORRENCIA')

  if (intercorrenciaRecords.length === 0) {
    return y // Pula se não houver registros
  }

  // Título
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('INTERCORRÊNCIAS / OBSERVAÇÕES', MARGIN, y)

  // Calcular altura dinâmica
  const lineHeight = 3.5
  let estimatedLines = 0
  intercorrenciaRecords.forEach(record => {
    estimatedLines++ // Linha da intercorrência
    if (record.data?.acaoTomada) estimatedLines++ // Linha da ação
  })
  const sectionHeight = Math.min(Math.max(10, estimatedLines * lineHeight + 5), 30) // Min 10mm, Max 30mm

  // Moldura
  doc.setDrawColor(150, 150, 150)
  doc.rect(MARGIN, y + 2, CONTENT_WIDTH, sectionHeight)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')

  let textY = y + 6

  intercorrenciaRecords.forEach(record => {
    if (textY > y + sectionHeight - 2) return // Evita overflow
    const desc = record.data?.descricao || 'Intercorrência'
    const shortDesc = desc.length > 75 ? desc.substring(0, 75) + '...' : desc
    doc.text(`• ${record.time} - ${shortDesc}`, MARGIN + 2, textY)
    textY += lineHeight
    if (record.data?.acaoTomada && textY <= y + sectionHeight - 2) {
      const acao = record.data.acaoTomada.length > 75 ? record.data.acaoTomada.substring(0, 75) + '...' : record.data.acaoTomada
      doc.setFontSize(6)
      doc.text(`  Ação: ${acao}`, MARGIN + 4, textY)
      doc.setFontSize(7)
      textY += lineHeight
    }
  })

  return y + sectionHeight + 7 // Retorna próxima posição Y
}

/**
 * Desenha rodapé com assinatura e informações de geração
 */
function drawFooter(doc: jsPDF, records: DailyRecord[]): void {
  const y = PAGE_HEIGHT - 25

  // Linha divisória
  doc.setDrawColor(200, 200, 200)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  // Responsável (pega o primeiro registro para obter o nome)
  const responsavel = records.length > 0 ? records[0].recordedBy : 'Não informado'
  doc.text(`Responsável pelo registro: ${responsavel}`, MARGIN, y + 5)

  // Campo para assinatura
  doc.text('Assinatura: _______________________', MARGIN, y + 12)
  doc.text(`Data: ___/___/______`, PAGE_WIDTH - MARGIN - 40, y + 12)

  // Linha do sistema (centralizada, itálico, cinza)
  const dataHoraGeracao = getCurrentDateTime()

  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100, 100, 100)
  doc.text(
    `Gerado pelo Sistema RAFA ILPI em ${dataHoraGeracao}`,
    PAGE_WIDTH / 2,
    y + 19,
    { align: 'center' }
  )

  // Resetar cor do texto
  doc.setTextColor(0, 0, 0)
}

// ==================== FUNÇÃO PRINCIPAL ====================

/**
 * Gera PDF dos registros diários
 */
export async function generateDailyRecordsPDF(data: PDFData): Promise<void> {
  try {
    // Criar documento
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Desenhar seções
    const currentY = drawHeader(doc, data)
    drawFoodHydration(doc, data.records, currentY)
    drawVitals(doc, data.records, currentY)
    drawHygieneElimination(doc, data.records, currentY)
    drawActivitiesBehavior(doc, data.records, currentY)
    drawIncidents(doc, data.records, currentY)

    // Rodapé sempre na mesma posição
    drawFooter(doc, data.records)

    // Salvar PDF
    const dateForFilename = normalizeUTCDate(data.date)
    const fileName = `Registro_${data.resident.fullName.replace(/\s+/g, '_')}_${dateForFilename.getFullYear()}-${String(dateForFilename.getMonth() + 1).padStart(2, '0')}-${String(dateForFilename.getDate()).padStart(2, '0')}.pdf`
    doc.save(fileName)

  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    throw new Error('Falha ao gerar PDF')
  }
}
