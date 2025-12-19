/**
 * Utilitários para renderização e formatação de registros diários
 * Usado em DailyRecordsPage e ResidentMedicalRecord para manter consistência visual
 */

export const RECORD_TYPE_LABELS: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  HIGIENE: {
    label: 'Higiene',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700/30',
  },
  ALIMENTACAO: {
    label: 'Alimentação',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-700/30',
  },
  HIDRATACAO: {
    label: 'Hidratação',
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-100 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-700/30',
  },
  MONITORAMENTO: {
    label: 'Monitoramento',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700/30',
  },
  ELIMINACAO: {
    label: 'Eliminação',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-800/30 border-gray-300 dark:border-gray-600/30',
  },
  COMPORTAMENTO: {
    label: 'Estado Emocional',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700/30',
  },
  HUMOR: {
    label: 'Humor',
    color: 'text-violet-700 dark:text-violet-300',
    bgColor: 'bg-violet-100 dark:bg-violet-950/30 border-violet-300 dark:border-violet-700/30',
  },
  SONO: {
    label: 'Sono',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700/30',
  },
  PESO: {
    label: 'Peso/Altura',
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-100 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700/30',
  },
  INTERCORRENCIA: {
    label: 'Intercorrência',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-950/30 border-red-300 dark:border-red-700/30',
  },
  ATIVIDADES: {
    label: 'Atividades',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700/30',
  },
  VISITA: {
    label: 'Visita',
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-100 dark:bg-pink-950/30 border-pink-300 dark:border-pink-700/30',
  },
  OUTROS: {
    label: 'Outros',
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800/30 border-slate-300 dark:border-slate-600/30',
  },
}

export function renderRecordSummary(record: any): string {
  switch (record.type) {
    case 'HIGIENE': {
      const parts = []
      // Só exibir banho se não for "Sem banho"
      if (record.data.tipoBanho && record.data.tipoBanho !== 'Sem banho') {
        parts.push(`Banho: ${record.data.tipoBanho}`)
      }
      if (record.data.condicaoPele) parts.push(`Pele: ${record.data.condicaoPele}`)
      if (record.data.higieneBucal) parts.push('Higiene bucal ✓')
      if (record.data.trocaFralda) parts.push('Troca de fralda/roupa ✓')
      return parts.length > 0 ? parts.join(' | ') : 'Higiene realizada'
    }
    case 'ALIMENTACAO': {
      const parts = [`${record.data.refeicao}`]
      if (record.data.ingeriu) parts.push(record.data.ingeriu)
      if (record.data.consistencia && record.data.consistencia !== 'Geral') {
        parts.push(`(${record.data.consistencia})`)
      }
      // Líquidos durante a refeição
      if (record.data.volumeMl && parseInt(record.data.volumeMl) > 0) {
        parts.push(`${record.data.volumeMl} ml líquidos`)
      }
      if (record.data.intercorrencia && record.data.intercorrencia !== 'Nenhuma') {
        parts.push(`⚠ ${record.data.intercorrencia}`)
      }
      return parts.join(' - ')
    }
    case 'HIDRATACAO':
      return `${record.data.volumeMl} ml${record.data.tipo ? ` de ${record.data.tipo}` : ''}`
    case 'MONITORAMENTO': {
      const vitals = []
      if (record.data.pressaoArterial) vitals.push(`PA: ${record.data.pressaoArterial}`)
      if (record.data.temperatura) vitals.push(`Temp: ${record.data.temperatura}°C`)
      if (record.data.frequenciaCardiaca) vitals.push(`FC: ${record.data.frequenciaCardiaca} bpm`)
      if (record.data.saturacaoO2) vitals.push(`SpO2: ${record.data.saturacaoO2}%`)
      if (record.data.glicemia) vitals.push(`Glicemia: ${record.data.glicemia} mg/dL`)
      return vitals.join(' | ') || 'Monitoramento realizado'
    }
    case 'ELIMINACAO': {
      const parts = [record.data.tipo]

      if (record.data.tipo === 'Fezes') {
        if (record.data.consistencia) parts.push(record.data.consistencia)
        if (record.data.cor) parts.push(record.data.cor)
        if (record.data.volume) parts.push(record.data.volume)
      } else if (record.data.tipo === 'Urina') {
        if (record.data.cor) parts.push(record.data.cor)
        if (record.data.odor && record.data.odor !== 'Normal') parts.push(`Odor: ${record.data.odor}`)
        if (record.data.volume) parts.push(record.data.volume)
      }

      if (record.data.trocaFralda) parts.push('Troca de fralda ✓')

      return parts.join(' - ')
    }
    case 'COMPORTAMENTO': {
      const parts = [record.data.estadoEmocional]
      if (record.data.estadoEmocional === 'Outro' && record.data.outroEstado) {
        parts.push(`(${record.data.outroEstado})`)
      }
      if (record.data.observacoes) {
        parts.push(record.data.observacoes.substring(0, 60))
      }
      return parts.join(' - ')
    }
    case 'HUMOR': {
      const parts = [record.data.humor]
      if (record.data.humor === 'Outro' && record.data.outroHumor) {
        parts.push(`(${record.data.outroHumor})`)
      }
      if (record.data.observacoes) {
        parts.push(record.data.observacoes.substring(0, 60))
      }
      return parts.join(' - ')
    }
    case 'SONO': {
      const parts = [record.data.padraoSono]
      if (record.data.padraoSono === 'Outro' && record.data.outroPadrao) {
        parts.push(`(${record.data.outroPadrao})`)
      }
      if (record.data.observacoes) {
        parts.push(record.data.observacoes.substring(0, 60))
      }
      return parts.join(' - ')
    }
    case 'PESO': {
      const parts = [`${record.data.peso} kg`]
      if (record.data.altura) {
        parts.push(`${record.data.altura} cm`)
      }
      if (record.data.imc) {
        parts.push(`IMC: ${record.data.imc.toFixed(1)} kg/m²`)
      }
      return parts.join(' | ')
    }
    case 'INTERCORRENCIA': {
      const descricao = record.data.descricao.substring(0, 60)
      const acao = record.data.acaoTomada ? ` → ${record.data.acaoTomada.substring(0, 60)}` : ''
      return `${descricao}${acao}`.substring(0, 120) + '...'
    }
    case 'ATIVIDADES': {
      const parts = [record.data.atividade]
      if (record.data.participacao) {
        const participacao = record.data.participacao.substring(0, 50)
        parts.push(participacao)
      }
      return parts.join(' - ')
    }
    case 'VISITA': {
      const parts = [`Visitante: ${record.data.visitante}`]
      if (record.data.observacoes && record.data.observacoes !== 'Sem observações') {
        parts.push(record.data.observacoes.substring(0, 50))
      }
      return parts.join(' - ')
    }
    case 'OUTROS':
      return record.data.descricao.substring(0, 100) + (record.data.descricao.length > 100 ? '...' : '')
    default:
      return 'Registro'
  }
}
