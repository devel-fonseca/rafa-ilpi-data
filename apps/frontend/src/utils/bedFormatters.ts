import type { Bed } from '@/api/beds.api'

export interface BedIdentificationParts {
  full: string            // CLI6-823-B
  building: string        // CLI6
  floor: string           // 6
  room: string            // 823
  bed: string             // B
  buildingFloor: string   // CLI6
  roomBed: string         // 823-B
}

/**
 * Formata identificação completa do leito no padrão hospitalar brasileiro
 * Formato: {building.code}{floor.code}-{room.code}-{bed.code}
 *
 * @param buildingCode - Código do prédio (ex: "CLI", "PP", "ANEXO")
 * @param floorCode - Código do andar (ex: "6", "T", "1")
 * @param roomCode - Código do quarto (ex: "823", "101", "305")
 * @param bedCode - Código do leito (ex: "A", "B", "01")
 * @returns Identificação completa (ex: "CLI6-823-B")
 *
 * @example
 * formatBedIdentification("CLI", "6", "823", "B") // "CLI6-823-B"
 * formatBedIdentification("PP", "1", "101", "A") // "PP1-101-A"
 */
export function formatBedIdentification(
  buildingCode: string,
  floorCode: string,
  roomCode: string,
  bedCode: string
): string {
  if (!buildingCode || !floorCode || !roomCode || !bedCode) {
    return '-'
  }

  return `${buildingCode}${floorCode}-${roomCode}-${bedCode}`
}

/**
 * Formata identificação do leito a partir do objeto Bed completo
 *
 * @param bed - Objeto Bed com room, floor e building populados
 * @returns Identificação completa do leito ou código simples se hierarquia não disponível
 *
 * @example
 * formatBedFromObject(bed) // "CLI6-823-B"
 */
export function formatBedFromObject(bed: Bed): string {
  // Se bed.code já contém o código completo (formato: XXX-XXX-X), retornar direto
  if (bed?.code && bed.code.includes('-')) {
    return bed.code
  }

  // Se não tem hierarquia completa, retornar o código simples
  if (!bed?.room?.floor?.building) {
    return bed?.code || '-'
  }

  // Montar código completo a partir da hierarquia
  return formatBedIdentification(
    bed.room.floor.building.code,
    bed.room.floor.code,
    bed.room.code,
    bed.code
  )
}

/**
 * Formata identificação do leito a partir do objeto Resident
 *
 * @param resident - Objeto Resident com building, floor, room e bed
 * @returns Identificação completa do leito
 *
 * @example
 * formatBedFromResident(resident) // "CLI6-823-B"
 */
export function formatBedFromResident(resident: any): string {
  // Se bed.code já contém o código completo (formato: XXX-XXX-X), retornar direto
  if (resident?.bed?.code && resident.bed.code.includes('-')) {
    return resident.bed.code
  }

  // Senão, construir a partir da hierarquia (fallback para dados antigos)
  if (!resident?.building?.code || !resident?.floor?.code ||
      !resident?.room?.code || !resident?.bed?.code) {
    return '-'
  }

  return formatBedIdentification(
    resident.building.code,
    resident.floor.code,
    resident.room.code,
    resident.bed.code
  )
}

/**
 * Extrai partes da identificação para exibição hierárquica
 *
 * @param buildingCode - Código do prédio
 * @param floorCode - Código do andar
 * @param roomCode - Código do quarto
 * @param bedCode - Código do leito
 * @returns Objeto com todas as partes da identificação
 *
 * @example
 * parseBedIdentification("CLI", "6", "823", "B")
 * // { full: 'CLI6-823-B', building: 'CLI6', room: '823', bed: 'B', ... }
 */
export function parseBedIdentification(
  buildingCode: string,
  floorCode: string,
  roomCode: string,
  bedCode: string
): BedIdentificationParts {
  const full = formatBedIdentification(buildingCode, floorCode, roomCode, bedCode)

  return {
    full,
    building: buildingCode,
    floor: floorCode,
    room: roomCode,
    bed: bedCode,
    buildingFloor: `${buildingCode}${floorCode}`,
    roomBed: `${roomCode}-${bedCode}`,
  }
}

/**
 * Formata para exibição em contexto (com label)
 *
 * @param buildingCode - Código do prédio
 * @param floorCode - Código do andar
 * @param roomCode - Código do quarto
 * @param bedCode - Código do leito
 * @returns Identificação com label "Leito"
 *
 * @example
 * formatBedWithLabel("CLI", "6", "823", "B") // "Leito CLI6-823-B"
 */
export function formatBedWithLabel(
  buildingCode: string,
  floorCode: string,
  roomCode: string,
  bedCode: string
): string {
  const identification = formatBedIdentification(buildingCode, floorCode, roomCode, bedCode)

  if (identification === '-') {
    return '-'
  }

  return `Leito ${identification}`
}

/**
 * Gera sugestões de códigos de prédio baseado no nome
 *
 * @param buildingName - Nome do prédio
 * @returns Array de sugestões de códigos
 *
 * @example
 * generateBuildingCodeSuggestions("Casa Principal")
 * // ["CP", "CP1", "CAS", "CASA"]
 */
export function generateBuildingCodeSuggestions(buildingName: string): string[] {
  if (!buildingName || buildingName.trim() === '') {
    return []
  }

  // Extrai iniciais
  const initials = buildingName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()

  // Gera variações
  const suggestions = [
    initials,                                    // "Casa Principal" → "CP"
    initials + '1',                              // "CP1"
    buildingName.slice(0, 3).toUpperCase(),      // "CAS"
    buildingName.slice(0, 4).toUpperCase(),      // "CASA"
  ].filter(Boolean) // Remove strings vazias

  // Remove duplicatas
  return [...new Set(suggestions)]
}
