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
    case 'HIGIENE':
      return `Banho: ${record.data.tipoBanho} | Pele: ${record.data.condicaoPele}`
    case 'ALIMENTACAO':
      return `${record.data.refeicao}: ${record.data.ingeriu}`
    case 'HIDRATACAO':
      return `Hidratação: ${record.data.volumeMl} ml${record.data.tipo ? ` (${record.data.tipo})` : ''}`
    case 'MONITORAMENTO':
      const vitals = []
      if (record.data.pressaoArterial) vitals.push(`PA: ${record.data.pressaoArterial}`)
      if (record.data.temperatura) vitals.push(`Temp: ${record.data.temperatura}°C`)
      if (record.data.frequenciaCardiaca) vitals.push(`FC: ${record.data.frequenciaCardiaca}`)
      if (record.data.saturacaoO2) vitals.push(`SpO2: ${record.data.saturacaoO2}%`)
      if (record.data.glicemia) vitals.push(`Glicemia: ${record.data.glicemia}`)
      return vitals.join(' | ') || 'Monitoramento realizado'
    case 'ELIMINACAO':
      return `${record.data.tipo}${record.data.frequencia ? ` (${record.data.frequencia}x)` : ''}`
    case 'COMPORTAMENTO':
      return record.data.descricao.substring(0, 80) + (record.data.descricao.length > 80 ? '...' : '')
    case 'INTERCORRENCIA':
      return `${record.data.descricao} - ${record.data.acaoTomada}`.substring(0, 80) + '...'
    case 'ATIVIDADES':
      return record.data.atividade
    case 'VISITA':
      return `Visitante: ${record.data.visitante}`
    case 'OUTROS':
      return record.data.descricao.substring(0, 80) + (record.data.descricao.length > 80 ? '...' : '')
    default:
      return 'Registro'
  }
}
