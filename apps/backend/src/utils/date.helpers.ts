/**
 * =========================================================
 * DATE HELPERS - Backend DateTime Standard
 * =========================================================
 *
 * REGRAS FUNDAMENTAIS:
 * 1. Data civil (sem hora, sem fuso) => DATE (YYYY-MM-DD). Nunca converter com timezone.
 * 2. Momento exato (auditoria) => TIMESTAMPTZ em UTC (ISO 8601 com Z).
 * 3. Agendamento local => DATE + TIME + tenantTimezone (IANA).
 * 4. Timezone padrão: America/Sao_Paulo
 * 5. recordDate: Imutável (não reclassifica ao mudar TZ do tenant)
 *
 * @author Rafa Labs
 * @date 2025-01-06
 */

import { parseISO, format, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/**
 * ✅ SEMPRE USE para campos DATE do Prisma
 *
 * Converte string YYYY-MM-DD para string YYYY-MM-DD (identidade garantida)
 * NUNCA retorna Date() JavaScript para evitar timezone shifts
 *
 * @param dateStr - String no formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
 * @returns String no formato YYYY-MM-DD
 *
 * @example
 * parseDateOnly('2025-01-06') // '2025-01-06'
 * parseDateOnly('2025-01-06T12:00:00.000') // '2025-01-06'
 */
export function parseDateOnly(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error(
      `[date.helpers] parseDateOnly: entrada inválida - ${dateStr}`,
    );
  }

  // Se já está no formato YYYY-MM-DD, retornar diretamente
  const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnlyRegex.test(dateStr.trim())) {
    return dateStr.trim();
  }

  // Se é timestamp, extrair apenas a parte da data
  const timestampRegex = /^\d{4}-\d{2}-\d{2}T/;
  if (timestampRegex.test(dateStr.trim())) {
    return dateStr.split('T')[0];
  }

  throw new Error(
    `[date.helpers] parseDateOnly: formato inválido - ${dateStr}. Esperado: YYYY-MM-DD`,
  );
}

/**
 * ✅ USE para formatar Date → YYYY-MM-DD
 *
 * Garante que Date JS vire string sem timezone shift
 *
 * @param date - Date JS ou string ISO
 * @returns String YYYY-MM-DD
 *
 * @example
 * formatDateOnly(new Date('2025-01-06T15:30:00Z')) // '2025-01-06'
 */
export function formatDateOnly(date: Date | string): string {
  if (typeof date === 'string') {
    return parseDateOnly(date);
  }

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error(`[date.helpers] formatDateOnly: data inválida - ${date}`);
  }

  // Usar UTC para evitar timezone shift
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * ✅ USE para parsear timestamps ISO 8601 em UTC
 *
 * Valida e converte string ISO para Date
 *
 * @param isoString - String ISO 8601 (ex: "2025-01-06T15:30:00.000Z")
 * @returns Date em UTC
 */
export function parseTimestamp(isoString: string): Date {
  if (!isoString || typeof isoString !== 'string') {
    throw new Error(
      `[date.helpers] parseTimestamp: entrada inválida - ${isoString}`,
    );
  }

  const date = parseISO(isoString);

  if (isNaN(date.getTime())) {
    throw new Error(
      `[date.helpers] parseTimestamp: timestamp inválido - ${isoString}`,
    );
  }

  return date;
}

/**
 * ✅ USE para converter timestamp UTC para exibição em timezone do tenant
 *
 * @param timestamp - Date em UTC
 * @param tenantTimezone - Timezone IANA (ex: "America/Sao_Paulo")
 * @returns String formatada para exibição
 *
 * @example
 * const utc = new Date('2025-01-06T15:00:00.000Z');
 * toTenantZonedDisplay(utc, 'America/Sao_Paulo') // '06/01/2025 12:00' (GMT-3)
 */
export function toTenantZonedDisplay(
  timestamp: Date,
  tenantTimezone: string = DEFAULT_TIMEZONE,
  formatStr: string = 'dd/MM/yyyy HH:mm',
): string {
  const zonedDate = toZonedTime(timestamp, tenantTimezone);
  return format(zonedDate, formatStr);
}

/**
 * ✅ USE para obter data atual no timezone do tenant
 *
 * Retorna string YYYY-MM-DD da data ATUAL no timezone especificado
 * Útil para criar recordDate que nunca deve mudar ao alterar tenant.timezone
 *
 * @param tenantTimezone - Timezone IANA
 * @returns String YYYY-MM-DD
 *
 * @example
 * getCurrentDateInTz('America/Sao_Paulo') // '2025-01-06' (horário de SP)
 * getCurrentDateInTz('America/New_York') // Pode ser '2025-01-05' (horário NY)
 */
export function getCurrentDateInTz(
  tenantTimezone: string = DEFAULT_TIMEZONE,
): string {
  const now = new Date();
  const zonedNow = toZonedTime(now, tenantTimezone);
  return format(zonedNow, 'yyyy-MM-dd');
}

/**
 * ✅ USE para construir Date range de um dia específico em timezone
 *
 * Retorna { start, end } em UTC para queries BETWEEN
 *
 * @param dateStr - String YYYY-MM-DD
 * @param tenantTimezone - Timezone IANA
 * @returns { start: Date, end: Date } em UTC
 *
 * @example
 * const range = getDayRangeInTz('2025-01-06', 'America/Sao_Paulo');
 * // range.start = 2025-01-06T03:00:00.000Z (00:00 em GMT-3)
 * // range.end   = 2025-01-07T02:59:59.999Z (23:59:59.999 em GMT-3)
 */
export function getDayRangeInTz(
  dateStr: string,
  tenantTimezone: string = DEFAULT_TIMEZONE,
): { start: Date; end: Date } {
  const dateOnly = parseDateOnly(dateStr);
  const localMidnight = parseISO(`${dateOnly}T00:00:00`);

  const start = fromZonedTime(localMidnight, tenantTimezone);
  const endLocal = endOfDay(localMidnight);
  const end = fromZonedTime(endLocal, tenantTimezone);

  return { start, end };
}

/**
 * ✅ USE para converter data/hora local do tenant para UTC
 *
 * @param dateStr - String YYYY-MM-DD
 * @param timeStr - String HH:mm
 * @param tenantTimezone - Timezone IANA
 * @returns Date em UTC
 *
 * @example
 * localToUTC('2025-01-06', '10:00', 'America/Sao_Paulo')
 * // Date representando 2025-01-06T13:00:00.000Z (10h em GMT-3 = 13h UTC)
 */
export function localToUTC(
  dateStr: string,
  timeStr: string,
  tenantTimezone: string = DEFAULT_TIMEZONE,
): Date {
  const dateOnly = parseDateOnly(dateStr);
  const localDateTime = parseISO(`${dateOnly}T${timeStr}:00`);
  return fromZonedTime(localDateTime, tenantTimezone);
}

/**
 * ✅ USE para validar formato YYYY-MM-DD
 *
 * @param dateStr - String a validar
 * @returns true se válido
 */
export function isValidDateOnly(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = parseISO(dateStr);
  return !isNaN(date.getTime());
}

/**
 * ✅ USE para validar formato HH:mm
 *
 * @param timeStr - String a validar
 * @returns true se válido
 */
export function isValidTime(timeStr: string): boolean {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(timeStr);
}
