export function formatWeightInput(
  rawValue: string,
  maxIntegerDigits = 3,
  maxDecimalDigits = 1,
): string {
  const normalized = rawValue.replace(/\./g, ',').replace(/[^\d,]/g, '')
  if (!normalized) return ''

  const hasComma = normalized.includes(',')
  const [rawInteger = '', rawDecimal = ''] = normalized.split(',')

  const integerPart = rawInteger.replace(/\D/g, '').slice(0, maxIntegerDigits)
  const decimalPart = rawDecimal.replace(/\D/g, '').slice(0, maxDecimalDigits)

  if (!hasComma) return integerPart
  return decimalPart.length > 0 ? `${integerPart},${decimalPart}` : `${integerPart},`
}

export function formatHeightCmInput(rawValue: string, maxDigits = 3): string {
  return rawValue.replace(/\D/g, '').slice(0, maxDigits)
}

export function parseWeightInput(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  if (!normalized) return null

  const parsed = Number(normalized.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function parseHeightCmInput(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  if (!normalized) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function centimetersToMeters(cm: number): number {
  return Number((cm / 100).toFixed(2))
}

export function metersToCentimeters(meters: number): number {
  return Math.round(meters * 100)
}

export function calculateBmiFromKgCm(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || heightCm <= 0) return null
  const heightMeters = heightCm / 100
  if (heightMeters <= 0) return null
  return weightKg / (heightMeters * heightMeters)
}

