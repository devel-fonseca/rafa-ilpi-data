/**
 * Utilitários de formatação para dados brasileiros
 */

/**
 * Formata CPF: 123.456.789-00
 */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '-'
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length !== 11) return cpf
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Remove formatação do CPF: retorna apenas os 11 dígitos
 * Usado para enviar dados ao backend
 */
export function cleanCPF(cpf: string | null | undefined): string | undefined {
  if (!cpf) return undefined
  const cleaned = cpf.replace(/\D/g, '')
  return cleaned.length === 11 ? cleaned : undefined
}

/**
 * Formata CNS: 123 4567 8901 2345
 */
export function formatCNS(cns: string | null | undefined): string {
  if (!cns) return '-'
  const cleaned = cns.replace(/\D/g, '')
  if (cleaned.length !== 15) return cns
  return cleaned.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4')
}

/**
 * Formata RG
 */
export function formatRG(rg: string | null | undefined, orgaoExpedidor?: string | null): string {
  if (!rg) return '-'
  const formatted = rg.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4')
  if (orgaoExpedidor) {
    return `${formatted} (${orgaoExpedidor})`
  }
  return formatted
}

/**
 * Formata telefone: (11) 98765-4321 ou (11) 3333-3333
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-'
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.length === 11) {
    // Celular: (11) 98765-4321
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (cleaned.length === 10) {
    // Fixo: (11) 3333-3333
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }

  return phone
}

/**
 * Formata CEP: 01234-567
 */
export function formatCEP(cep: string | null | undefined): string {
  if (!cep) return '-'
  const cleaned = cep.replace(/\D/g, '')
  if (cleaned.length !== 8) return cep
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2')
}

/**
 * Formata CNPJ: 12.345.678/0001-99
 */
export function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '-'
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length !== 14) return cnpj
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/**
 * Formata data: DD/MM/YYYY
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'

  try {
     
    // OK: Este helper é usado APENAS para exibição, não envia dados ao backend
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const day = String(dateObj.getDate()).padStart(2, '0')
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const year = dateObj.getFullYear()
    return `${day}/${month}/${year}`
  } catch (error) {
    return '-'
  }
}

/**
 * Formata data e hora: DD/MM/YYYY às HH:mm
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'

  try {
     
    // OK: Este helper é usado APENAS para exibição, não envia dados ao backend
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const day = String(dateObj.getDate()).padStart(2, '0')
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const year = dateObj.getFullYear()
    const hours = String(dateObj.getHours()).padStart(2, '0')
    const minutes = String(dateObj.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} às ${hours}:${minutes}`
  } catch (error) {
    return '-'
  }
}

/**
 * Calcula idade detalhada a partir da data de nascimento
 * Retorna: "87 anos, 8 meses, 0 dias"
 */
export function calculateAge(birthDate: string | Date | null | undefined): string {
  if (!birthDate) return '-'

  try {
    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
    const today = new Date()

    let years = today.getFullYear() - birth.getFullYear()
    let months = today.getMonth() - birth.getMonth()
    let days = today.getDate() - birth.getDate()

    if (days < 0) {
      months--
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      days += lastMonth.getDate()
    }

    if (months < 0) {
      years--
      months += 12
    }

    const yearText = years === 1 ? 'ano' : 'anos'
    const monthText = months === 1 ? 'mês' : 'meses'
    const dayText = days === 1 ? 'dia' : 'dias'

    return `${years} ${yearText}, ${months} ${monthText}, ${days} ${dayText}`
  } catch (error) {
    return '-'
  }
}

/**
 * Formata endereço completo
 */
export function formatAddress(
  street: string | null | undefined,
  number: string | null | undefined,
  complement: string | null | undefined,
  district: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined,
  zipCode: string | null | undefined
): string {
  const parts: string[] = []

  if (street) {
    let addressLine = street
    if (number) addressLine += `, ${number}`
    if (complement) addressLine += ` - ${complement}`
    parts.push(addressLine)
  }

  if (district || city || state) {
    let cityLine = ''
    if (district) cityLine += district
    if (city) {
      if (cityLine) cityLine += ' - '
      cityLine += city
    }
    if (state) {
      if (cityLine) cityLine += '/'
      cityLine += state
    }
    if (cityLine) parts.push(cityLine)
  }

  if (zipCode) {
    parts.push(`CEP: ${formatCEP(zipCode)}`)
  }

  return parts.length > 0 ? parts.join('\n') : '-'
}

/**
 * Traduz labels de enum para português
 */
export const translateEnum = {
  gender: (value: string | null | undefined): string => {
    if (!value) return '-'
    const map: Record<string, string> = {
      'MASCULINO': 'Masculino',
      'FEMININO': 'Feminino',
      'OUTRO': 'Outro',
      'NAO_INFORMADO': 'Não informado'
    }
    return map[value] || value
  },

  estadoCivil: (value: string | null | undefined): string => {
    if (!value) return '-'
    const map: Record<string, string> = {
      'SOLTEIRO': 'Solteiro(a)',
      'CASADO': 'Casado(a)',
      'DIVORCIADO': 'Divorciado(a)',
      'VIUVO': 'Viúvo(a)',
      'UNIAO_ESTAVEL': 'União Estável'
    }
    return map[value] || value
  },

  escolaridade: (value: string | null | undefined): string => {
    if (!value) return '-'
    const map: Record<string, string> = {
      'ANALFABETO': 'Analfabeto',
      'FUNDAMENTAL_INCOMPLETO': 'Ensino Fundamental Incompleto',
      'FUNDAMENTAL_COMPLETO': 'Ensino Fundamental Completo',
      'MEDIO_INCOMPLETO': 'Ensino Médio Incompleto',
      'MEDIO_COMPLETO': 'Ensino Médio Completo',
      'SUPERIOR_INCOMPLETO': 'Ensino Superior Incompleto',
      'SUPERIOR_COMPLETO': 'Ensino Superior Completo',
      'POS_GRADUACAO': 'Pós-Graduação'
    }
    return map[value] || value
  },

  tipoAdmissao: (value: string | null | undefined): string => {
    if (!value) return '-'
    const map: Record<string, string> = {
      'TEMPORARIA': 'Temporária',
      'LONGA_PERMANENCIA': 'Longa permanência'
    }
    return map[value] || value
  },

  dependenciaGrau: (value: string | null | undefined): string => {
    if (!value) return '-'
    const map: Record<string, string> = {
      'GRAU_I': 'Grau I - Independente',
      'GRAU_II': 'Grau II - Dependente em até 3 AVDs',
      'GRAU_III': 'Grau III - Dependente em mais de 3 AVDs'
    }
    return map[value] || value
  },

  tipoResponsavel: (value: string | null | undefined): string => {
    if (!value) return '-'
    const map: Record<string, string> = {
      'CURADOR': 'Curador',
      'PROCURADOR': 'Procurador',
      'RESPONSAVEL_FAMILIAR': 'Responsável Familiar'
    }
    return map[value] || value
  }
}

/**
 * Retorna valor ou '-' se vazio
 */
export function valueOrDash(value: any): string {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

/**
 * Formata natureza jurídica para exibição amigável
 */
export function formatLegalNature(legalNature: string | null | undefined): string {
  if (!legalNature) return '-'

  const labels: Record<string, string> = {
    ASSOCIACAO: 'Associação sem fins lucrativos',
    FUNDACAO: 'Fundação privada',
    EMPRESA_PRIVADA: 'Empresa privada',
    MEI: 'Microempreendedor Individual (MEI)',
  }

  return labels[legalNature] || legalNature
}

/**
 * Funções de formatação de leitos
 */
export * from './bedFormatters'
