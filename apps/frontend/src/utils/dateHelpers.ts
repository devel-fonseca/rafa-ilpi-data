/**
 * =========================================================
 * DATE HELPERS - Solução Definitiva para Timezone
 * =========================================================
 *
 * Problema documentado em 03/12/2025:
 * Sistema apresentava bugs recorrentes de timezone causados por:
 * - new Date('2025-12-03') interpreta como UTC 00:00 → GMT-3 21:00 dia anterior
 * - Comparações de datas sem normalização de timezone
 * - Mixagem de padrões (alguns arquivos usavam timezone.ts, outros não)
 *
 * Solução:
 * - Centralizar TODAS operações de data neste arquivo
 * - SEMPRE converter UTC → America/Sao_Paulo antes de usar
 * - Funções type-safe com nomes descritivos
 * - Zero dependência de new Date(string) sem conversão
 *
 * @author Rafa Labs - Backend Specialist Review
 * @date 2025-12-03
 */

import { format as formatDateFns, parseISO, parse, isValid } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

// =========================================================
// CONSTANTES
// =========================================================

/**
 * Timezone padrão do sistema (Brasil - São Paulo)
 * GMT-3 (ou GMT-2 durante horário de verão, se aplicável)
 */
export const SYSTEM_TIMEZONE = 'America/Sao_Paulo'

// =========================================================
// 1. NORMALIZAÇÃO DE DATAS UTC → LOCAL
// =========================================================

/**
 * ✅ SEMPRE USE ESTA FUNÇÃO para converter datas do backend
 *
 * Converte string UTC ISO 8601 para Date object no timezone local
 *
 * @example
 * // Backend retorna: "2025-12-03T10:30:00.000Z" (UTC 10:30)
 * const localDate = normalizeUTCDate("2025-12-03T10:30:00.000Z")
 * // Result: Date representando 07:30 no timezone America/Sao_Paulo (GMT-3)
 *
 * @param utcDateString - String ISO 8601 do backend (ex: "2025-12-03T10:30:00.000Z")
 * @returns Date object no timezone local
 * @throws Error se string for inválida
 */
export function normalizeUTCDate(utcDateString: string | Date): Date {
  if (utcDateString instanceof Date) {
    return toZonedTime(utcDateString, SYSTEM_TIMEZONE)
  }

  if (!utcDateString || typeof utcDateString !== 'string') {
    throw new Error(`[dateHelpers] normalizeUTCDate: entrada inválida - ${utcDateString}`)
  }

  try {
    // 🔧 FIX: Detectar se é apenas data (date-only field do Prisma @db.Date)
    // Casos:
    // 1. "2025-12-03" → date-only string (raro)
    // 2. "2025-12-03T00:00:00.000Z" → Prisma @db.Date serializado (comum)
    // Ambos devem ser tratados como date-only (sem conversão de timezone)

    const isDateOnlyString = /^\d{4}-\d{2}-\d{2}$/.test(utcDateString.trim())
    const isMidnightUTC = /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/.test(utcDateString.trim())
    // FIX TIMESTAMPTZ: Após migração para TIMESTAMPTZ, datas são armazenadas com 12h (meio-dia)
    // Ex: "2025-12-06T12:00:00.000-03:00" → deve ser tratado como date-only
    const isNoonTimestamp = /^\d{4}-\d{2}-\d{2}T12:00:00\.000/.test(utcDateString.trim())

    if (isDateOnlyString || isMidnightUTC || isNoonTimestamp) {
      // Para date-only, extrair apenas a parte da data e interpretar como meia-noite LOCAL
      const dateOnlyPart = utcDateString.split('T')[0]
      const localMidnight = parseISO(`${dateOnlyPart}T00:00:00`)
      return localMidnight
    }

    // Para timestamps completos com hora real, fazer conversão UTC → Local normal
    const utcDate = parseISO(utcDateString)

    if (!isValid(utcDate)) {
      throw new Error('Data inválida após parseISO')
    }

    return toZonedTime(utcDate, SYSTEM_TIMEZONE)
  } catch (error) {
    throw new Error(
      `[dateHelpers] Erro ao normalizar data UTC: ${utcDateString}. ` +
      `Erro original: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

// =========================================================
// 2. EXTRAÇÃO SEGURA DE DATA (yyyy-MM-dd)
// =========================================================

/**
 * ✅ USE ESTA FUNÇÃO em vez de .substring(0, 10)
 *
 * Extrai apenas a parte de data (yyyy-MM-dd) de forma segura
 * Garante conversão para timezone local antes de extrair
 *
 * @example
 * // Backend retorna: "2025-12-03T23:00:00.000Z" (UTC 23:00)
 * // Sem conversão: substring daria "2025-12-03"
 * // Com conversão: América/SP é 20:00 do mesmo dia
 * extractDateOnly("2025-12-03T23:00:00.000Z") // "2025-12-03" ✅
 *
 * // Caso problemático:
 * // Backend: "2025-12-03T02:00:00.000Z" (UTC 02:00)
 * // América/SP: 23:00 do dia ANTERIOR (2025-12-02)
 * extractDateOnly("2025-12-03T02:00:00.000Z") // "2025-12-02" ✅
 *
 * @param utcDateString - String ISO 8601 do backend
 * @returns String no formato yyyy-MM-dd (data local)
 */
export function extractDateOnly(utcDateString: string | Date): string {
  const localDate = normalizeUTCDate(utcDateString)
  return formatDateFns(localDate, 'yyyy-MM-dd')
}

// =========================================================
// 3. COMPARAÇÕES SEGURAS DE DATAS
// =========================================================

/**
 * ✅ USE para comparar se duas datas são do MESMO DIA
 *
 * Compara apenas a parte de data, ignorando horário
 * Converte ambas para timezone local antes de comparar
 *
 * @example
 * isSameDay("2025-12-03T10:00:00.000Z", "2025-12-03T23:00:00.000Z") // true
 * isSameDay("2025-12-03T02:00:00.000Z", "2025-12-03T10:00:00.000Z") // false (02:00 UTC = 23:00 dia anterior em GMT-3)
 *
 * @param date1 - Primeira data (string UTC ou Date)
 * @param date2 - Segunda data (string UTC ou Date)
 * @returns true se são do mesmo dia (timezone local)
 */
export function isSameDay(
  date1: string | Date,
  date2: string | Date
): boolean {
  const dateOnly1 = extractDateOnly(date1)
  const dateOnly2 = extractDateOnly(date2)
  return dateOnly1 === dateOnly2
}

/**
 * ✅ USE para verificar se date1 < date2 (apenas data, sem horário)
 *
 * @example
 * isDateBefore("2025-12-02", "2025-12-03") // true
 * isDateBefore("2025-12-03", "2025-12-03") // false
 *
 * @param date1 - Primeira data
 * @param date2 - Segunda data
 * @returns true se date1 for anterior a date2
 */
export function isDateBefore(
  date1: string | Date,
  date2: string | Date
): boolean {
  const dateOnly1 = extractDateOnly(date1)
  const dateOnly2 = extractDateOnly(date2)
  return dateOnly1 < dateOnly2
}

/**
 * ✅ USE para verificar se date1 > date2 (apenas data, sem horário)
 *
 * @example
 * isDateAfter("2025-12-04", "2025-12-03") // true
 * isDateAfter("2025-12-03", "2025-12-03") // false
 *
 * @param date1 - Primeira data
 * @param date2 - Segunda data
 * @returns true se date1 for posterior a date2
 */
export function isDateAfter(
  date1: string | Date,
  date2: string | Date
): boolean {
  const dateOnly1 = extractDateOnly(date1)
  const dateOnly2 = extractDateOnly(date2)
  return dateOnly1 > dateOnly2
}

// =========================================================
// 4. FORMATAÇÃO SEGURA
// =========================================================

/**
 * ✅ USE para formatar datas do backend para exibição
 *
 * Converte UTC → Local e formata com locale pt-BR
 *
 * @example
 * formatDateSafe("2025-12-03T10:00:00.000Z", "dd/MM/yyyy HH:mm")
 * // "03/12/2025 07:00" (convertido para GMT-3)
 *
 * formatDateSafe("2025-12-03T10:00:00.000Z", "dd 'de' MMMM 'de' yyyy")
 * // "03 de dezembro de 2025"
 *
 * @param utcDateString - String UTC do backend
 * @param formatString - Formato desejado (padrão date-fns)
 * @returns String formatada no timezone local
 */
export function formatDateSafe(
  utcDateString: string | Date,
  formatString: string = 'dd/MM/yyyy HH:mm'
): string {
  const localDate = normalizeUTCDate(utcDateString)
  return formatDateFns(localDate, formatString, { locale: ptBR })
}

/**
 * ✅ USE para formatar APENAS data (sem horário)
 *
 * Atalho para exibir data curta (dd/MM/yyyy)
 *
 * @example
 * formatDateOnlySafe("2025-12-03T10:00:00.000Z") // "03/12/2025"
 *
 * @param utcDateString - String UTC do backend
 * @returns String formatada (dd/MM/yyyy)
 */
export function formatDateOnlySafe(utcDateString: string | Date): string {
  return formatDateSafe(utcDateString, 'dd/MM/yyyy')
}

/**
 * ✅ USE para formatar data longa (ex: "03 de dezembro de 2025")
 *
 * @example
 * formatDateLongSafe("2025-12-03T10:00:00.000Z") // "03 de dezembro de 2025"
 *
 * @param utcDateString - String UTC do backend
 * @returns String formatada no formato longo
 */
export function formatDateLongSafe(utcDateString: string | Date): string {
  return formatDateSafe(utcDateString, "dd 'de' MMMM 'de' yyyy")
}

/**
 * ✅ USE para formatar data + hora completa
 *
 * @example
 * formatDateTimeSafe("2025-12-03T10:00:00.000Z") // "03/12/2025 07:00"
 *
 * @param utcDateString - String UTC do backend
 * @returns String formatada (dd/MM/yyyy HH:mm)
 */
export function formatDateTimeSafe(utcDateString: string | Date): string {
  return formatDateSafe(utcDateString, 'dd/MM/yyyy HH:mm')
}

/**
 * ✅ USE para formatar apenas horário (HH:mm)
 *
 * @example
 * formatTimeSafe("2025-12-03T10:30:00.000Z") // "07:30"
 *
 * @param utcDateString - String UTC do backend
 * @returns String formatada (HH:mm)
 */
export function formatTimeSafe(utcDateString: string | Date): string {
  return formatDateSafe(utcDateString, 'HH:mm')
}

/**
 * ✅ USE para formatar data + hora curta (para gráficos)
 *
 * @example
 * formatDateTimeShortSafe("2025-12-03T10:30:00.000Z") // "03/12 07:30"
 *
 * @param utcDateString - String UTC do backend
 * @returns String formatada (dd/MM HH:mm)
 */
export function formatDateTimeShortSafe(utcDateString: string | Date): string {
  return formatDateSafe(utcDateString, 'dd/MM HH:mm')
}

// =========================================================
// 5. OBTER DATA/HORA ATUAL (LOCAL)
// =========================================================

/**
 * ✅ USE para obter data atual no timezone local
 *
 * Retorna string yyyy-MM-dd da data ATUAL no timezone Brasil
 *
 * @example
 * getCurrentDate() // "2025-12-03"
 *
 * @returns String no formato yyyy-MM-dd
 */
export function getCurrentDate(): string {
  const now = new Date()
  const localNow = toZonedTime(now, SYSTEM_TIMEZONE)
  return formatDateFns(localNow, 'yyyy-MM-dd')
}

/**
 * ✅ USE para obter horário atual no timezone local
 *
 * Retorna string HH:mm do horário ATUAL no timezone Brasil
 *
 * @example
 * getCurrentTime() // "14:30"
 *
 * @returns String no formato HH:mm
 */
export function getCurrentTime(): string {
  const now = new Date()
  const localNow = toZonedTime(now, SYSTEM_TIMEZONE)
  return formatDateFns(localNow, 'HH:mm')
}

/**
 * ✅ USE para obter data + hora atual formatada
 *
 * @example
 * getCurrentDateTime() // "03/12/2025 14:30"
 *
 * @returns String formatada (dd/MM/yyyy HH:mm)
 */
export function getCurrentDateTime(): string {
  const now = new Date()
  const localNow = toZonedTime(now, SYSTEM_TIMEZONE)
  return formatDateFns(localNow, 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

/**
 * ✅ USE para obter data + hora atual no formato HTML5 datetime-local
 *
 * Formato compatível com <input type="datetime-local">
 *
 * @example
 * getCurrentDateTimeLocal() // "2025-12-03T14:30"
 *
 * @returns String formatada (yyyy-MM-ddTHH:mm)
 */
export function getCurrentDateTimeLocal(): string {
  const now = new Date()
  const localNow = toZonedTime(now, SYSTEM_TIMEZONE)
  return formatDateFns(localNow, "yyyy-MM-dd'T'HH:mm")
}

// =========================================================
// 6. CONVERSÃO LOCAL → UTC (para enviar ao backend)
// =========================================================

/**
 * ✅ USE ao ENVIAR datas para o backend
 *
 * Converte Date local para UTC ISO 8601
 *
 * @example
 * const localDate = new Date('2025-12-03T14:30') // Usuário seleciona 14:30
 * localToUTC(localDate) // "2025-12-03T17:30:00.000Z" (convertido para UTC)
 *
 * @param localDate - Date no timezone local
 * @returns Date em UTC (pronto para backend)
 */
export function localToUTC(localDate: Date): Date {
  return fromZonedTime(localDate, SYSTEM_TIMEZONE)
}

/**
 * ✅ USE para criar string ISO 8601 UTC a partir de componentes locais
 *
 * @example
 * // Usuário escolhe data "2025-12-03" e horário "14:30"
 * buildUTCFromLocalComponents("2025-12-03", "14:30")
 * // "2025-12-03T17:30:00.000Z" (convertido para UTC)
 *
 * @param dateString - Data local (yyyy-MM-dd)
 * @param timeString - Horário local (HH:mm)
 * @returns String ISO 8601 em UTC
 */
export function buildUTCFromLocalComponents(
  dateString: string,
  timeString: string
): string {
  const localDateTimeString = `${dateString}T${timeString}:00`
  const localDate = parse(localDateTimeString, "yyyy-MM-dd'T'HH:mm:ss", new Date())
  const utcDate = fromZonedTime(localDate, SYSTEM_TIMEZONE)
  return utcDate.toISOString()
}

// =========================================================
// 7. HELPERS DE DEBUG
// =========================================================

/**
 * 🔍 USE para debug de problemas de timezone
 *
 * Exibe todas as representações de uma data UTC
 *
 * @example
 * debugDate("2025-12-03T02:00:00.000Z")
 * // Console:
 * // ========================================
 * // DEBUG DATE: 2025-12-03T02:00:00.000Z
 * // ========================================
 * // UTC Original: 2025-12-03T02:00:00.000Z
 * // Local (America/Sao_Paulo): 2025-12-02T23:00:00
 * // Apenas Data (yyyy-MM-dd): 2025-12-02
 * // Formatado (dd/MM/yyyy HH:mm): 02/12/2025 23:00
 * // ========================================
 */
export function debugDate(utcDateString: string): void {
  console.log('========================================')
  console.log(`DEBUG DATE: ${utcDateString}`)
  console.log('========================================')

  try {
    const localDate = normalizeUTCDate(utcDateString)
    console.log('UTC Original:', utcDateString)
    console.log('Local (America/Sao_Paulo):', formatDateFns(localDate, "yyyy-MM-dd'T'HH:mm:ss"))
    console.log('Apenas Data (yyyy-MM-dd):', extractDateOnly(utcDateString))
    console.log('Formatado (dd/MM/yyyy HH:mm):', formatDateTimeSafe(utcDateString))
  } catch (error) {
    console.error('ERRO:', error instanceof Error ? error.message : String(error))
  }

  console.log('========================================')
}

// =========================================================
// 8. MIGRATION HELPERS (compatibilidade com timezone.ts)
// =========================================================

/**
 * @deprecated Use getCurrentDate() instead
 * Compatibilidade temporária com timezone.ts
 */
export function getCurrentDateLocal(formatString: string = 'yyyy-MM-dd'): string {
  if (formatString !== 'yyyy-MM-dd') {
    console.warn('[dateHelpers] getCurrentDateLocal com formato customizado está deprecated. Use formatDateSafe() ou getCurrentDate()')
  }
  return getCurrentDate()
}

/**
 * @deprecated Use getCurrentTime() instead
 * Compatibilidade temporária com timezone.ts
 */
export function getCurrentTimeLocal(formatString: string = 'HH:mm'): string {
  if (formatString !== 'HH:mm') {
    console.warn('[dateHelpers] getCurrentTimeLocal com formato customizado está deprecated. Use formatTimeSafe() ou getCurrentTime()')
  }
  return getCurrentTime()
}
