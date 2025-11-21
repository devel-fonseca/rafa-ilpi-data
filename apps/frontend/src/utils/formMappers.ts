/**
 * Funções de mapeamento/conversão de dados entre o formato do formulário e o backend
 * Centraliza toda a lógica de transformação de dados para evitar duplicação
 */

// ========== CONVERSÃO DE DATAS ==========

/**
 * Converte data ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss.sssZ) para formato brasileiro DD/MM/YYYY
 * Usado para preencher campos de input quando carrega dados do backend
 */
export const convertISOToDisplayDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) return ''
  try {
    const datePart = isoDate.split('T')[0]
    const [year, month, day] = datePart.split('-')
    return `${day}/${month}/${year}`
  } catch (error) {
    console.error('Erro ao converter data ISO para display:', isoDate, error)
    return ''
  }
}

/**
 * Converte DD/MM/YYYY para YYYY-MM-DDTHH:mm:ss.000Z (ISO 8601)
 * Usado para enviar datas para o backend
 */
export const convertToISODate = (dateStr: string | undefined): string | null => {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`
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
