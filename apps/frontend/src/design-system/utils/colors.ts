/**
 * 🎨 Design System RAFA ILPI - Color Utilities
 *
 * Helpers adicionais para manipulação de cores e classes CSS
 *
 * @author Dr. E. (Emanuel) + Claude Code
 * @date 24 de novembro de 2025
 */

import type { BedStatus, RecordType, Severity, MedicationCategory, ControlledClass, RoomType } from '../tokens/colors'

/**
 * Converte status de leito para classes Tailwind de background + texto
 *
 * @param status - Status do leito
 * @returns String com classes Tailwind
 */
export function getBedStatusClasses(status: BedStatus): string {
  const map: Record<BedStatus, string> = {
    DISPONIVEL: 'bg-success/10 text-success border-success/30',
    OCUPADO: 'bg-danger/10 text-danger border-danger/30',
    MANUTENCAO: 'bg-warning/10 text-warning border-warning/30',
    RESERVADO: 'bg-info/10 text-info border-info/30',
  }
  return map[status] || map.DISPONIVEL
}

/**
 * Converte tipo de quarto para classes Tailwind
 */
export function getRoomTypeClasses(type: RoomType): string {
  const map: Record<RoomType, string> = {
    INDIVIDUAL: 'bg-blue-100 text-blue-800 border-blue-300',
    DUPLO: 'bg-green-100 text-green-800 border-green-300',
    TRIPLO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    COLETIVO: 'bg-purple-100 text-purple-800 border-purple-300',
  }
  return map[type] || map.INDIVIDUAL
}

/**
 * Converte tipo de registro para classes Tailwind
 */
export function getRecordTypeClasses(type: RecordType): string {
  const map: Record<RecordType, string> = {
    HIGIENE: 'bg-blue-100 text-blue-700 border-blue-300',
    ALIMENTACAO: 'bg-green-100 text-green-700 border-green-300',
    HIDRATACAO: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    MONITORAMENTO: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    ELIMINACAO: 'bg-gray-100 text-gray-700 border-gray-300',
    COMPORTAMENTO: 'bg-purple-100 text-purple-700 border-purple-300',
    INTERCORRENCIA: 'bg-red-100 text-red-700 border-red-300',
    ATIVIDADES: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    VISITA: 'bg-pink-100 text-pink-700 border-pink-300',
    OUTROS: 'bg-slate-100 text-slate-700 border-slate-300',
  }
  return map[type] || map.OUTROS
}

/**
 * Converte severidade para classes Tailwind
 */
export function getSeverityClasses(severity: Severity): string {
  const map: Record<Severity, string> = {
    CRITICAL: 'bg-danger/10 text-danger border-danger/30',
    WARNING: 'bg-orange-100 text-orange-700 border-orange-300',
    INFO: 'bg-info/10 text-info border-info/30',
  }
  return map[severity] || map.INFO
}

/**
 * Converte categoria de medicamento para classes Tailwind
 */
export function getMedicationClasses(category: MedicationCategory): string {
  const map: Record<MedicationCategory, string> = {
    CONTROLADO: 'bg-accent/10 text-accent border-accent/30',
    SOS: 'bg-orange-100 text-orange-700 border-orange-300',
    ALTO_RISCO: 'bg-danger/10 text-danger border-danger/30',
  }
  return map[category] || map.CONTROLADO
}

/**
 * Converte classe de medicamento controlado para classes Tailwind
 */
export function getControlledClassClasses(controlledClass: ControlledClass): string {
  const map: Record<ControlledClass, string> = {
    BZD: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    PSICOFARMACO: 'bg-purple-100 text-purple-700 border-purple-300',
    OPIOIDE: 'bg-red-100 text-red-700 border-red-300',
    ANTICONVULSIVANTE: 'bg-blue-100 text-blue-700 border-blue-300',
    OUTRO: 'bg-gray-100 text-gray-700 border-gray-300',
  }
  return map[controlledClass] || map.OUTRO
}

/**
 * Retorna cor de ocupação baseada em percentual
 *
 * @param rate - Taxa de ocupação (0-100)
 * @returns Classe Tailwind de background
 */
export function getOccupancyColor(rate: number): string {
  if (rate >= 90) return 'bg-danger'
  if (rate >= 70) return 'bg-warning'
  return 'bg-success'
}

/**
 * Retorna cor de aceitação alimentar baseada em percentual
 *
 * @param percentage - Percentual de aceitação (0-100)
 * @returns Objeto com classes de background e texto
 */
export function getAcceptanceColor(percentage: number): { bg: string; text: string } {
  if (percentage >= 75) {
    return { bg: 'bg-success/10', text: 'text-success' }
  }
  if (percentage >= 50) {
    return { bg: 'bg-warning/10', text: 'text-warning' }
  }
  return { bg: 'bg-danger/10', text: 'text-danger' }
}

/**
 * Converte nome de cor semântica para variante de StatusBadge
 *
 * @example
 * ```ts
 * getStatusBadgeVariant('bed', 'DISPONIVEL') // 'bed-available'
 * getStatusBadgeVariant('record', 'HIGIENE') // 'record-higiene'
 * ```
 */
export function getStatusBadgeVariant(
  category: 'bed' | 'record' | 'severity' | 'medication' | 'controlled' | 'room',
  type: string
): string {
  const normalized = type.toLowerCase().replace('_', '-')
  return `${category}-${normalized}`
}

/**
 * Verifica se uma cor é clara ou escura (útil para determinar cor de texto)
 *
 * @param hsl - String HSL no formato 'H S% L%'
 * @returns true se a cor é clara (lightness > 50%)
 */
export function isLightColor(hsl: string): boolean {
  const matches = hsl.match(/(\d+)%/)
  if (!matches) return false
  const lightness = parseInt(matches[1])
  return lightness > 50
}

export default {
  getBedStatusClasses,
  getRoomTypeClasses,
  getRecordTypeClasses,
  getSeverityClasses,
  getMedicationClasses,
  getControlledClassClasses,
  getOccupancyColor,
  getAcceptanceColor,
  getStatusBadgeVariant,
  isLightColor,
}
