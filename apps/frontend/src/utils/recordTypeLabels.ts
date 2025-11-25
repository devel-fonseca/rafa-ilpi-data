/**
 * Utilitários para renderização e formatação de registros diários
 * Usado em DailyRecordsPage e ResidentProfile para manter consistência visual
 */

export const RECORD_TYPE_LABELS: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  HIGIENE: {
    label: 'Higiene',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-300',
  },
  ALIMENTACAO: {
    label: 'Alimentação',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-300',
  },
  HIDRATACAO: {
    label: 'Hidratação',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100 border-cyan-300',
  },
  MONITORAMENTO: {
    label: 'Monitoramento',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 border-yellow-300',
  },
  ELIMINACAO: {
    label: 'Eliminação',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 border-gray-300',
  },
  COMPORTAMENTO: {
    label: 'Comportamento',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 border-purple-300',
  },
  INTERCORRENCIA: {
    label: 'Intercorrência',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-300',
  },
  ATIVIDADES: {
    label: 'Atividades',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100 border-indigo-300',
  },
  VISITA: {
    label: 'Visita',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100 border-pink-300',
  },
  OUTROS: {
    label: 'Outros',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100 border-slate-300',
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
    case 'COMPORTAMENTO':
      return record.data.descricao.substring(0, 100) + (record.data.descricao.length > 100 ? '...' : '')
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
