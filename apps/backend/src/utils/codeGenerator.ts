/**
 * Utilitário para geração automática de códigos inteligentes
 * Gera códigos curtos, únicos e fáceis de identificar
 */

/**
 * Remove acentos e caracteres especiais
 */
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toUpperCase()
    .trim()
}

/**
 * Gera código de 2 caracteres a partir do nome
 * Estratégias:
 * 1. Primeiras 2 letras
 * 2. Primeira letra de cada palavra (se houver 2+ palavras)
 * 3. Primeira e última letra
 * 4. Adiciona número se necessário
 */
export function generateBuildingCode(name: string, existingCodes: string[]): string {
  const normalized = normalizeText(name)
  const words = normalized.split(/\s+/).filter(w => w.length > 0)

  const strategies = [
    // Estratégia 1: Primeiras 2 letras
    () => normalized.substring(0, 2),

    // Estratégia 2: Primeira letra de cada palavra (máx 2)
    () => words.slice(0, 2).map(w => w[0]).join(''),

    // Estratégia 3: Primeira e última letra da primeira palavra
    () => words[0] ? words[0][0] + words[0][words[0].length - 1] : '',

    // Estratégia 4: Primeira letra + segunda letra da segunda palavra
    () => words.length > 1 ? words[0][0] + words[1][0] : '',

    // Estratégia 5: Duas primeiras consoantes
    () => {
      const consonants = normalized.replace(/[AEIOU]/g, '').substring(0, 2)
      return consonants.padEnd(2, normalized[0] || 'X')
    }
  ]

  // Tenta cada estratégia
  for (const strategy of strategies) {
    const code = strategy()
    if (code && code.length === 2 && !existingCodes.includes(code)) {
      return code
    }
  }

  // Se todas falharam, adiciona números
  const base = normalized.substring(0, 1) || 'B'
  for (let i = 1; i <= 99; i++) {
    const code = base + i.toString().padStart(1, '0')
    if (!existingCodes.includes(code)) {
      return code.substring(0, 2)
    }
  }

  // Fallback final
  return 'XX'
}

/**
 * Gera código para andar
 * Térreo = TR, outros = 01, 02, etc
 */
export function generateFloorCode(name: string, floorNumber?: number): string {
  const normalized = normalizeText(name)

  // Verifica se é térreo
  if (normalized.includes('TERREO') || normalized.includes('TERR') || floorNumber === 0) {
    return 'TR'
  }

  // Se tem número no nome, usa ele
  const numberMatch = normalized.match(/\d+/)
  if (numberMatch) {
    return numberMatch[0].padStart(2, '0').substring(0, 2)
  }

  // Se foi passado número do andar
  if (floorNumber !== undefined) {
    return floorNumber.toString().padStart(2, '0')
  }

  // Tenta extrair do nome (Primeiro, Segundo, etc)
  const ordinals: Record<string, string> = {
    'PRIMEIRO': '01',
    'SEGUNDO': '02',
    'TERCEIRO': '03',
    'QUARTO': '04',
    'QUINTO': '05',
    'SEXTO': '06',
    'SETIMO': '07',
    'OITAVO': '08',
    'NONO': '09',
    'DECIMO': '10',
    'SUBSOLO': 'SS'
  }

  for (const [key, value] of Object.entries(ordinals)) {
    if (normalized.includes(key)) {
      return value
    }
  }

  // Default
  return '01'
}

/**
 * Gera código para quarto
 * Usa número do quarto ou estratégia similar aos prédios
 */
export function generateRoomCode(
  name: string,
  existingCodes: string[],
  roomNumber?: number
): string {
  const normalized = normalizeText(name)

  // Se tem número no nome, usa ele
  const numberMatch = normalized.match(/\d+/)
  if (numberMatch) {
    const num = numberMatch[0].padStart(2, '0')
    if (!existingCodes.includes(num)) {
      return num.substring(0, 2)
    }
  }

  // Se foi passado número do quarto
  if (roomNumber !== undefined) {
    const code = roomNumber.toString().padStart(2, '0')
    if (!existingCodes.includes(code)) {
      return code
    }
  }

  // Usa estratégia similar aos prédios mas com prefixo Q
  const base = normalized.substring(0, 1) || 'Q'
  for (let i = 1; i <= 99; i++) {
    const code = base + i.toString()
    if (code.length <= 2 && !existingCodes.includes(code)) {
      return code
    }
  }

  // Números sequenciais
  for (let i = 1; i <= 99; i++) {
    const code = i.toString().padStart(2, '0')
    if (!existingCodes.includes(code)) {
      return code
    }
  }

  return '99'
}

/**
 * Gera código para leito
 * Letras A, B, C... ou números 01, 02, 03...
 */
export function generateBedCode(
  name: string,
  existingCodes: string[],
  bedNumber?: number,
  useLetters: boolean = true
): string {
  const normalized = normalizeText(name)

  // Se tem letra no nome (Leito A, Cama B, etc)
  const letterMatch = normalized.match(/[A-Z]/)
  if (letterMatch && !existingCodes.includes(letterMatch[0])) {
    return letterMatch[0]
  }

  // Se tem número no nome
  const numberMatch = normalized.match(/\d+/)
  if (numberMatch) {
    const num = numberMatch[0].padStart(2, '0').substring(0, 2)
    if (!existingCodes.includes(num)) {
      return num
    }
  }

  // Se deve usar letras
  if (useLetters) {
    for (let i = 65; i <= 90; i++) { // A-Z
      const letter = String.fromCharCode(i)
      if (!existingCodes.includes(letter)) {
        return letter
      }
    }
  }

  // Usa números
  for (let i = 1; i <= 99; i++) {
    const code = i.toString().padStart(2, '0')
    if (!existingCodes.includes(code)) {
      return code
    }
  }

  return 'XX'
}