import type { VitalSign } from '@/api/vitalSigns.api'
import { formatDateTimeSafe } from './dateHelpers'

/**
 * Formata sinais vitais para inserção em texto clínico (campo Objetivo do SOAP)
 *
 * Gera texto formatado com os dados disponíveis no último sinal vital,
 * incluindo data/hora e registrador.
 *
 * @param vitalSign - Objeto com dados do sinal vital
 * @returns String formatada para inserção no campo Objetivo
 *
 * @example
 * formatVitalSignsToText(lastVitalSign)
 * // Output:
 * // "Sinais Vitais (04/12/2025 15:30):"
 * // "• PA: 120/80 mmHg"
 * // "• FC: 75 bpm"
 * // "• Temperatura: 36.5°C"
 * // "• SpO2: 98%"
 * // "• Glicemia: 95 mg/dL"
 */
export function formatVitalSignsToText(vitalSign: VitalSign | null): string {
  if (!vitalSign) {
    return 'Sem sinais vitais registrados recentemente.'
  }

  const lines: string[] = []

  // Cabeçalho com data/hora
  const timestamp = formatDateTimeSafe(vitalSign.timestamp)
  lines.push(`Sinais Vitais (${timestamp}):`)

  // Pressão Arterial (PA)
  if (vitalSign.systolicBloodPressure && vitalSign.diastolicBloodPressure) {
    lines.push(
      `• PA: ${vitalSign.systolicBloodPressure}/${vitalSign.diastolicBloodPressure} mmHg`
    )
  } else if (vitalSign.systolicBloodPressure) {
    lines.push(`• PAS: ${vitalSign.systolicBloodPressure} mmHg`)
  } else if (vitalSign.diastolicBloodPressure) {
    lines.push(`• PAD: ${vitalSign.diastolicBloodPressure} mmHg`)
  }

  // Frequência Cardíaca (FC)
  if (vitalSign.heartRate) {
    lines.push(`• FC: ${vitalSign.heartRate} bpm`)
  }

  // Temperatura (Tax)
  if (vitalSign.temperature) {
    lines.push(`• Temperatura: ${vitalSign.temperature.toFixed(1)}°C`)
  }

  // Saturação de Oxigênio (SpO2)
  if (vitalSign.oxygenSaturation) {
    lines.push(`• SpO2: ${vitalSign.oxygenSaturation}%`)
  }

  // Glicemia
  if (vitalSign.bloodGlucose) {
    lines.push(`• Glicemia: ${vitalSign.bloodGlucose} mg/dL`)
  }

  // Registrador (se disponível)
  if (vitalSign.recordedBy) {
    lines.push(`(Registrado por: ${vitalSign.recordedBy})`)
  }

  // Se nenhum dado foi encontrado, retornar mensagem padrão
  if (lines.length === 1) {
    return 'Sem dados de sinais vitais disponíveis.'
  }

  return lines.join('\n')
}

/**
 * Formata sinais vitais para inserção compacta (uma linha)
 *
 * @param vitalSign - Objeto com dados do sinal vital
 * @returns String formatada em uma linha
 *
 * @example
 * formatVitalSignsCompact(lastVitalSign)
 * // Output: "SV: PA 120/80, FC 75, Tax 36.5°C, SpO2 98%, Gli 95 mg/dL"
 */
export function formatVitalSignsCompact(vitalSign: VitalSign | null): string {
  if (!vitalSign) {
    return 'SV: não registrados'
  }

  const parts: string[] = []

  // Pressão Arterial
  if (vitalSign.systolicBloodPressure && vitalSign.diastolicBloodPressure) {
    parts.push(`PA ${vitalSign.systolicBloodPressure}/${vitalSign.diastolicBloodPressure}`)
  }

  // Frequência Cardíaca
  if (vitalSign.heartRate) {
    parts.push(`FC ${vitalSign.heartRate}`)
  }

  // Temperatura
  if (vitalSign.temperature) {
    parts.push(`Tax ${vitalSign.temperature.toFixed(1)}°C`)
  }

  // SpO2
  if (vitalSign.oxygenSaturation) {
    parts.push(`SpO2 ${vitalSign.oxygenSaturation}%`)
  }

  // Glicemia
  if (vitalSign.bloodGlucose) {
    parts.push(`Gli ${vitalSign.bloodGlucose} mg/dL`)
  }

  return parts.length > 0 ? `SV: ${parts.join(', ')}` : 'SV: não registrados'
}

/**
 * Verifica se há alertas críticos em sinais vitais
 *
 * @param vitalSign - Objeto com dados do sinal vital
 * @returns Array de alertas críticos encontrados
 */
export function checkCriticalVitalSigns(vitalSign: VitalSign | null): string[] {
  if (!vitalSign) return []

  const alerts: string[] = []

  // Pressão Arterial (Hipertensão ou Hipotensão)
  if (vitalSign.systolicBloodPressure) {
    if (vitalSign.systolicBloodPressure >= 140) {
      alerts.push('⚠️ PAS elevada (≥140 mmHg)')
    } else if (vitalSign.systolicBloodPressure < 90) {
      alerts.push('⚠️ PAS baixa (<90 mmHg)')
    }
  }

  if (vitalSign.diastolicBloodPressure) {
    if (vitalSign.diastolicBloodPressure >= 90) {
      alerts.push('⚠️ PAD elevada (≥90 mmHg)')
    } else if (vitalSign.diastolicBloodPressure < 60) {
      alerts.push('⚠️ PAD baixa (<60 mmHg)')
    }
  }

  // Temperatura (Febre ou Hipotermia)
  if (vitalSign.temperature) {
    if (vitalSign.temperature >= 38) {
      alerts.push('⚠️ Febre (≥38°C)')
    } else if (vitalSign.temperature < 35) {
      alerts.push('⚠️ Hipotermia (<35°C)')
    }
  }

  // Saturação de Oxigênio (Hipoxemia)
  if (vitalSign.oxygenSaturation && vitalSign.oxygenSaturation < 92) {
    alerts.push('⚠️ SpO2 baixa (<92%)')
  }

  // Glicemia (Hiper ou Hipoglicemia)
  if (vitalSign.bloodGlucose) {
    if (vitalSign.bloodGlucose >= 180) {
      alerts.push('⚠️ Hiperglicemia (≥180 mg/dL)')
    } else if (vitalSign.bloodGlucose < 70) {
      alerts.push('⚠️ Hipoglicemia (<70 mg/dL)')
    }
  }

  // Frequência Cardíaca (Taquicardia ou Bradicardia)
  if (vitalSign.heartRate) {
    if (vitalSign.heartRate > 100) {
      alerts.push('⚠️ Taquicardia (>100 bpm)')
    } else if (vitalSign.heartRate < 60) {
      alerts.push('⚠️ Bradicardia (<60 bpm)')
    }
  }

  return alerts
}
