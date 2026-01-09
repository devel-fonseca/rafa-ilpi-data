/**
 * Funções de mapeamento/conversão de dados entre o formato do formulário e o backend
 * Centraliza toda a lógica de transformação de dados para evitar duplicação
 */

import { formatDateOnlySafe } from './dateHelpers'

// ========== CONVERSÃO DE DATAS (Pós-migração TIMESTAMPTZ) ==========

/**
 * Converte TIMESTAMPTZ do backend para formato brasileiro DD/MM/YYYY
 * Usado para preencher inputs no modo de edição
 *
 * IMPORTANTE: Usa formatDateOnlySafe() para evitar timezone shift em campos @db.Date
 */
export const timestamptzToDisplay = (timestamp: string | Date | null | undefined): string => {
  if (!timestamp) return ''
  try {
    // Usa formatDateOnlySafe que trata corretamente campos @db.Date (birthDate, admissionDate, etc)
    return formatDateOnlySafe(timestamp)
  } catch {
    return ''
  }
}

/**
 * Converte DD/MM/YYYY para YYYY-MM-DD
 * Backend espera string YYYY-MM-DD para campos DATE (@IsDateOnly validator)
 */
export const displayToDate = (dateStr: string | undefined): string | null => {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  // Retornar YYYY-MM-DD ao invés de Date object
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// ========== MAPEAMENTO DE ESTADO CIVIL ==========

/**
 * Mapeia estado civil do backend para o formato do frontend
 * Backend: SOLTEIRO, CASADO, DIVORCIADO, VIUVO, UNIAO_ESTAVEL
 * Frontend: Solteiro(a), Casado(a), Divorciado(a), Viúvo(a), União Estável
 */
export const mapEstadoCivilFromBackend = (estadoCivil: string | null | undefined): string => {
  if (!estadoCivil) return ''
  const mapping: Record<string, string> = {
    SOLTEIRO: 'Solteiro(a)',
    CASADO: 'Casado(a)',
    DIVORCIADO: 'Divorciado(a)',
    VIUVO: 'Viúvo(a)',
    UNIAO_ESTAVEL: 'União Estável'
  }
  return mapping[estadoCivil] || ''
}

/**
 * Mapeia estado civil do frontend para o formato do backend
 * Frontend: Solteiro(a), Casado(a), Divorciado(a), Viúvo(a), União Estável
 * Backend: SOLTEIRO, CASADO, DIVORCIADO, VIUVO, UNIAO_ESTAVEL
 */
export const mapEstadoCivilToBackend = (value: string | undefined): string | null => {
  if (!value) return null
  const map: Record<string, string> = {
    'Solteiro(a)': 'SOLTEIRO',
    'Casado(a)': 'CASADO',
    'Divorciado(a)': 'DIVORCIADO',
    'Viúvo(a)': 'VIUVO',
    'União Estável': 'UNIAO_ESTAVEL'
  }
  return map[value] || null
}

// ========== MAPEAMENTO DE TIPO SANGUÍNEO ==========

/**
 * Mapeia tipo sanguíneo do backend para o formato do frontend
 * Backend: A_POSITIVO, A_NEGATIVO, B_POSITIVO, B_NEGATIVO, AB_POSITIVO, AB_NEGATIVO, O_POSITIVO, O_NEGATIVO, NAO_INFORMADO
 * Frontend: A+, A-, B+, B-, AB+, AB-, O+, O-, (vazio para NAO_INFORMADO)
 */
export const mapTipoSanguineoFromBackend = (value: string | undefined): string => {
  if (!value || value === 'NAO_INFORMADO') return ''
  const map: Record<string, string> = {
    A_POSITIVO: 'A+',
    A_NEGATIVO: 'A-',
    B_POSITIVO: 'B+',
    B_NEGATIVO: 'B-',
    AB_POSITIVO: 'AB+',
    AB_NEGATIVO: 'AB-',
    O_POSITIVO: 'O+',
    O_NEGATIVO: 'O-'
  }
  return map[value] || ''
}

/**
 * Mapeia tipo sanguíneo do frontend para o formato do backend
 * Frontend: A+, A-, B+, B-, AB+, AB-, O+, O-
 * Backend: A_POSITIVO, A_NEGATIVO, B_POSITIVO, B_NEGATIVO, AB_POSITIVO, AB_NEGATIVO, O_POSITIVO, O_NEGATIVO, NAO_INFORMADO
 */
export const mapTipoSanguineoToBackend = (value: string | undefined): string => {
  if (!value) return 'NAO_INFORMADO'
  const map: Record<string, string> = {
    'A+': 'A_POSITIVO',
    'A-': 'A_NEGATIVO',
    'B+': 'B_POSITIVO',
    'B-': 'B_NEGATIVO',
    'AB+': 'AB_POSITIVO',
    'AB-': 'AB_NEGATIVO',
    'O+': 'O_POSITIVO',
    'O-': 'O_NEGATIVO'
  }
  return map[value] || 'NAO_INFORMADO'
}
