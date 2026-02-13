/**
 * Utilitários para renderização e formatação de registros diários
 * Usado em DailyRecordsPage e ResidentMedicalRecord para manter consistência visual
 */

import type {
  RecordType,
  AlimentacaoData,
  HigieneData,
  EliminacaoData,
  HidratacaoData,
  SonoData,
  HumorData,
  AtividadesData,
  ComportamentoData,
  IntercorrenciaData,
  MonitoramentoData,
  PesoData,
  VisitaData,
  OutrosData,
} from '@/types/daily-records'

export const RECORD_TYPE_LABELS: Record<
  RecordType,
  { label: string; color: string; bgColor: string; chartColor: string }
> = {
  HIGIENE: {
    label: 'Higiene',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700/30',
    chartColor: '#3b82f6',
  },
  ALIMENTACAO: {
    label: 'Alimentação',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-700/30',
    chartColor: '#22c55e',
  },
  HIDRATACAO: {
    label: 'Hidratação',
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-100 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-700/30',
    chartColor: '#06b6d4',
  },
  MONITORAMENTO: {
    label: 'Monitoramento',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700/30',
    chartColor: '#eab308',
  },
  ELIMINACAO: {
    label: 'Eliminação',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-800/30 border-gray-300 dark:border-gray-600/30',
    chartColor: '#6b7280',
  },
  COMPORTAMENTO: {
    label: 'Comportamento',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700/30',
    chartColor: '#a855f7',
  },
  HUMOR: {
    label: 'Humor',
    color: 'text-violet-700 dark:text-violet-300',
    bgColor: 'bg-violet-100 dark:bg-violet-950/30 border-violet-300 dark:border-violet-700/30',
    chartColor: '#8b5cf6',
  },
  SONO: {
    label: 'Sono',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700/30',
    chartColor: '#6366f1',
  },
  PESO: {
    label: 'Peso/Altura',
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-100 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700/30',
    chartColor: '#14b8a6',
  },
  INTERCORRENCIA: {
    label: 'Intercorrência',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-950/30 border-red-300 dark:border-red-700/30',
    chartColor: '#ef4444',
  },
  ATIVIDADES: {
    label: 'Atividades',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700/30',
    chartColor: '#6366f1',
  },
  VISITA: {
    label: 'Visita',
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-100 dark:bg-pink-950/30 border-pink-300 dark:border-pink-700/30',
    chartColor: '#ec4899',
  },
  OUTROS: {
    label: 'Outros',
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800/30 border-slate-300 dark:border-slate-600/30',
    chartColor: '#64748b',
  },
  OBSERVACAO: {
    label: 'Observação',
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800/30 border-slate-300 dark:border-slate-600/30',
    chartColor: '#64748b',
  },
}

/** Tipo de label para registros diários */
export type RecordTypeLabelConfig = {
  label: string
  color: string
  bgColor: string
  chartColor: string
}

/** Label padrão para tipos não reconhecidos */
const DEFAULT_LABEL: RecordTypeLabelConfig = {
  label: 'Outro',
  color: 'text-slate-700 dark:text-slate-300',
  bgColor: 'bg-slate-100 dark:bg-slate-800/30 border-slate-300 dark:border-slate-600/30',
  chartColor: '#64748b',
}

/**
 * Verifica se uma string é um RecordType válido
 */
export function isRecordType(type: string): type is RecordType {
  return type in RECORD_TYPE_LABELS
}

/**
 * Obtém as configurações de label para um tipo de registro.
 * Aceita string para compatibilidade com dados dinâmicos.
 *
 * @param type - Tipo do registro (pode ser string ou RecordType)
 * @returns Configuração de label ou default se tipo não reconhecido
 */
export function getRecordTypeLabel(type: string): RecordTypeLabelConfig {
  if (isRecordType(type)) {
    return RECORD_TYPE_LABELS[type]
  }
  return DEFAULT_LABEL
}

/**
 * Tipo de entrada para renderRecordSummary.
 * Usa discriminated union para permitir tipagem forte baseada no tipo do registro.
 */
type RecordSummaryInput =
  | { type: 'HIGIENE'; data: HigieneData }
  | { type: 'ALIMENTACAO'; data: AlimentacaoData }
  | { type: 'HIDRATACAO'; data: HidratacaoData }
  | { type: 'MONITORAMENTO'; data: MonitoramentoData }
  | { type: 'ELIMINACAO'; data: EliminacaoData }
  | { type: 'COMPORTAMENTO'; data: ComportamentoData }
  | { type: 'HUMOR'; data: HumorData }
  | { type: 'SONO'; data: SonoData }
  | { type: 'PESO'; data: PesoData }
  | { type: 'INTERCORRENCIA'; data: IntercorrenciaData }
  | { type: 'ATIVIDADES'; data: AtividadesData }
  | { type: 'VISITA'; data: VisitaData }
  | { type: 'OUTROS'; data: OutrosData }
  | { type: 'OBSERVACAO'; data: OutrosData }

export function renderRecordSummary(record: RecordSummaryInput): string {
  switch (record.type) {
    case 'HIGIENE': {
      const data = record.data
      const parts: string[] = []
      // Só exibir banho se não for "Sem banho"
      if (data.tipoBanho && data.tipoBanho !== 'Sem banho') {
        parts.push(`Banho: ${data.tipoBanho}`)
      }
      if (data.condicaoPele) parts.push(`Pele: ${data.condicaoPele}`)
      if (data.higieneBucal) parts.push('Higiene bucal ✓')
      if (data.trocaFralda) parts.push('Troca de fralda/roupa ✓')
      return parts.length > 0 ? parts.join(' | ') : 'Higiene realizada'
    }
    case 'ALIMENTACAO': {
      const data = record.data
      const parts: string[] = [`${data.refeicao ?? ''}`]
      if (data.ingeriu) parts.push(data.ingeriu)
      if (data.consistencia && data.consistencia !== 'Geral') {
        parts.push(`(${data.consistencia})`)
      }
      // Líquidos durante a refeição
      if (data.volumeMl && parseInt(String(data.volumeMl)) > 0) {
        parts.push(`${data.volumeMl} ml líquidos`)
      }
      if (data.intercorrencia && data.intercorrencia !== 'Nenhuma') {
        parts.push(`⚠ ${data.intercorrencia}`)
      }
      return parts.join(' - ')
    }
    case 'HIDRATACAO': {
      const data = record.data
      return `${data.volumeMl ?? 0} ml${data.tipo ? ` de ${data.tipo}` : ''}`
    }
    case 'MONITORAMENTO': {
      const data = record.data
      const vitals: string[] = []
      if (data.pressaoArterial) vitals.push(`PA: ${data.pressaoArterial}`)
      if (data.temperatura) vitals.push(`Temp: ${data.temperatura}°C`)
      if (data.frequenciaCardiaca) vitals.push(`FC: ${data.frequenciaCardiaca} bpm`)
      if (data.saturacaoO2) vitals.push(`SpO2: ${data.saturacaoO2}%`)
      if (data.glicemia) vitals.push(`Glicemia: ${data.glicemia} mg/dL`)
      return vitals.join(' | ') || 'Monitoramento realizado'
    }
    case 'ELIMINACAO': {
      const data = record.data
      const eliminationType =
        data.tipo === 'Fezes'
          ? 'Eliminação Intestinal'
          : data.tipo === 'Urina'
          ? 'Eliminação Urinária'
          : data.tipo
      const parts: (string | undefined)[] = [eliminationType]

      if (data.tipo === 'Fezes') {
        if (data.consistencia) parts.push(data.consistencia)
        if (data.cor) parts.push(data.cor)
        if (data.volume) parts.push(data.volume)
      } else if (data.tipo === 'Urina') {
        if (data.cor) parts.push(data.cor)
        if (data.odor && data.odor !== 'Normal') parts.push(`Odor: ${data.odor}`)
        if (data.volume) parts.push(data.volume)
      }

      if (data.trocaFralda) parts.push('Troca de fralda ✓')

      return parts.filter(Boolean).join(' - ')
    }
    case 'COMPORTAMENTO': {
      const data = record.data
      const parts: (string | undefined)[] = [data.descricao]
      return parts.filter(Boolean).join(' - ') || 'Comportamento registrado'
    }
    case 'HUMOR': {
      const data = record.data
      const parts: (string | undefined)[] = [data.humor]
      if (data.humor === 'Outro' && data.outroHumor) {
        parts.push(`(${data.outroHumor})`)
      }
      if (data.observacoes) {
        parts.push(data.observacoes.substring(0, 60))
      }
      return parts.filter(Boolean).join(' - ') || 'Humor registrado'
    }
    case 'SONO': {
      const data = record.data
      const parts: (string | undefined)[] = [data.padraoSono]
      if (data.padraoSono === 'Outro' && data.outroPadrao) {
        parts.push(`(${data.outroPadrao})`)
      }
      if (data.observacoes) {
        parts.push(data.observacoes.substring(0, 60))
      }
      return parts.filter(Boolean).join(' - ') || 'Sono registrado'
    }
    case 'PESO': {
      const data = record.data
      const parts: string[] = [`${data.peso ?? 0} kg`]
      if (data.altura) {
        parts.push(`${data.altura} cm`)
      }
      if (data.imc) {
        parts.push(`IMC: ${data.imc.toFixed(1)} kg/m²`)
      }
      return parts.join(' | ')
    }
    case 'INTERCORRENCIA': {
      const data = record.data
      const descricao = (data.descricao ?? '').substring(0, 60)
      const acao = data.acaoTomada ? ` → ${data.acaoTomada.substring(0, 60)}` : ''
      const result = `${descricao}${acao}`.substring(0, 120)
      return result.length > 0 ? result + '...' : 'Intercorrência registrada'
    }
    case 'ATIVIDADES': {
      const data = record.data
      const parts: (string | undefined)[] = [data.atividade]
      if (data.participacao) {
        const participacao = data.participacao.substring(0, 50)
        parts.push(participacao)
      }
      return parts.filter(Boolean).join(' - ') || 'Atividade registrada'
    }
    case 'VISITA': {
      const data = record.data
      const parts: string[] = [`Visitante: ${data.visitante ?? 'Não informado'}`]
      if (data.observacoes) {
        parts.push(data.observacoes.substring(0, 50))
      }
      return parts.join(' - ')
    }
    case 'OUTROS':
    case 'OBSERVACAO': {
      const data = record.data
      const descricao = data.descricao ?? ''
      return descricao.substring(0, 100) + (descricao.length > 100 ? '...' : '') || 'Registro'
    }
    default:
      return 'Registro'
  }
}
