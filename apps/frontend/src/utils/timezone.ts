/**
 * Utilitários para conversão de timezone UTC ↔ America/Sao_Paulo
 *
 * Problema documentado em 22/11/2025:
 * Backend e banco de dados armazenam timestamps em UTC (correto),
 * mas frontend não fazia conversão para timezone local do usuário.
 *
 * Solução:
 * - Backend mantém UTC (melhor prática internacional)
 * - Frontend converte UTC → America/Sao_Paulo para exibição
 * - Suporta expansão futura para multi-timezone
 */

import { format as formatDateFns, parseISO } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

// Timezone padrão do Brasil
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

/**
 * Converte data UTC para timezone local (America/Sao_Paulo)
 * @param utcDate - Data em UTC (string ISO ou Date)
 * @param timezone - Timezone de destino (padrão: America/Sao_Paulo)
 * @returns Date no timezone especificado
 */
export function utcToLocal(
  utcDate: string | Date,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate
  return toZonedTime(date, timezone)
}

/**
 * Converte data local (America/Sao_Paulo) para UTC
 * @param localDate - Data no timezone local
 * @param timezone - Timezone de origem (padrão: America/Sao_Paulo)
 * @returns Date em UTC
 */
export function localToUtc(
  localDate: Date,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  return fromZonedTime(localDate, timezone)
}

/**
 * Formata data UTC para exibição no formato brasileiro
 * @param utcDate - Data em UTC
 * @param formatString - Formato desejado (padrão: dd/MM/yyyy HH:mm:ss)
 * @param timezone - Timezone para conversão (padrão: America/Sao_Paulo)
 * @returns String formatada no timezone local
 */
export function formatUtcToLocal(
  utcDate: string | Date,
  formatString: string = 'dd/MM/yyyy HH:mm:ss',
  timezone: string = DEFAULT_TIMEZONE
): string {
  const localDate = utcToLocal(utcDate, timezone)
  return formatDateFns(localDate, formatString, { locale: ptBR })
}

/**
 * Obtém horário atual no timezone local (America/Sao_Paulo)
 * Útil para preencher campos de horário em formulários
 * @param formatString - Formato desejado (padrão: HH:mm)
 * @param timezone - Timezone (padrão: America/Sao_Paulo)
 * @returns String formatada com horário atual no timezone local
 */
export function getCurrentTimeLocal(
  formatString: string = 'HH:mm',
  timezone: string = DEFAULT_TIMEZONE
): string {
  const now = new Date()
  const localNow = toZonedTime(now, timezone)
  return formatDateFns(localNow, formatString)
}

/**
 * Obtém data atual no timezone local (America/Sao_Paulo)
 * @param formatString - Formato desejado (padrão: yyyy-MM-dd)
 * @param timezone - Timezone (padrão: America/Sao_Paulo)
 * @returns String formatada com data atual no timezone local
 */
export function getCurrentDateLocal(
  formatString: string = 'yyyy-MM-dd',
  timezone: string = DEFAULT_TIMEZONE
): string {
  const now = new Date()
  const localNow = toZonedTime(now, timezone)
  return formatDateFns(localNow, formatString)
}

/**
 * Formata data para exibição curta (dd/MM/yyyy)
 */
export function formatDateShort(utcDate: string | Date): string {
  return formatUtcToLocal(utcDate, 'dd/MM/yyyy')
}

/**
 * Formata data para exibição longa (dd 'de' MMMM 'de' yyyy)
 */
export function formatDateLong(utcDate: string | Date): string {
  return formatUtcToLocal(utcDate, "dd 'de' MMMM 'de' yyyy")
}

/**
 * Formata data e hora completa (dd/MM/yyyy HH:mm)
 */
export function formatDateTime(utcDate: string | Date): string {
  return formatUtcToLocal(utcDate, 'dd/MM/yyyy HH:mm')
}

/**
 * Formata apenas horário (HH:mm)
 */
export function formatTime(utcDate: string | Date): string {
  return formatUtcToLocal(utcDate, 'HH:mm')
}
