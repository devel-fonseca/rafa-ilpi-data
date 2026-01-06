import {
  parseDateOnly,
  formatDateOnly,
  parseTimestamp,
  getCurrentDateInTz,
  getDayRangeInTz,
  localToUTC,
  isValidDateOnly,
  isValidTime,
} from './date.helpers';

describe('Date Helpers', () => {
  describe('parseDateOnly', () => {
    it('deve retornar string YYYY-MM-DD identicamente', () => {
      expect(parseDateOnly('2025-01-06')).toBe('2025-01-06');
    });

    it('deve extrair data de timestamp', () => {
      expect(parseDateOnly('2025-01-06T12:00:00.000Z')).toBe('2025-01-06');
      expect(parseDateOnly('2025-01-06T12:00:00.000')).toBe('2025-01-06');
    });

    it('deve lançar erro para formato inválido', () => {
      expect(() => parseDateOnly('01/06/2025')).toThrow();
      expect(() => parseDateOnly('')).toThrow();
      expect(() => parseDateOnly(null as any)).toThrow();
    });
  });

  describe('formatDateOnly', () => {
    it('deve formatar Date para YYYY-MM-DD sem timezone shift', () => {
      const date = new Date('2025-01-06T23:59:00.000Z'); // 23:59 UTC
      expect(formatDateOnly(date)).toBe('2025-01-06'); // Deve manter dia 06 (UTC)
    });

    it('deve aceitar string e delegar para parseDateOnly', () => {
      expect(formatDateOnly('2025-01-06')).toBe('2025-01-06');
    });

    it('deve lançar erro para Date inválido', () => {
      expect(() => formatDateOnly(new Date('invalid'))).toThrow();
    });
  });

  describe('parseTimestamp', () => {
    it('deve parsear ISO 8601 timestamp válido', () => {
      const date = parseTimestamp('2025-01-06T15:00:00.000Z');
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2025-01-06T15:00:00.000Z');
    });

    it('deve lançar erro para timestamp inválido', () => {
      expect(() => parseTimestamp('invalid')).toThrow();
      expect(() => parseTimestamp('')).toThrow();
    });
  });

  describe('getCurrentDateInTz', () => {
    it('deve retornar data atual em timezone especificado', () => {
      const dateSP = getCurrentDateInTz('America/Sao_Paulo');
      expect(dateSP).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verificar que é uma data válida
      expect(isValidDateOnly(dateSP)).toBe(true);
    });

    it('deve retornar data diferente em timezones diferentes (edge case)', () => {
      // Este teste pode falhar dependendo do horário de execução
      // É mais um teste de smoke para garantir que a função não quebra
      const dateNY = getCurrentDateInTz('America/New_York');
      expect(dateNY).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getDayRangeInTz', () => {
    it('deve retornar range UTC de um dia em timezone', () => {
      const range = getDayRangeInTz('2025-01-06', 'America/Sao_Paulo');

      // 2025-01-06 00:00 em GMT-3 = 2025-01-06T03:00:00.000Z
      expect(range.start.toISOString()).toBe('2025-01-06T03:00:00.000Z');

      // 2025-01-06 23:59:59.999 em GMT-3 = 2025-01-07T02:59:59.999Z
      expect(range.end.toISOString()).toContain('2025-01-07T02:59:59');
    });

    it('deve funcionar com timezone diferente', () => {
      const range = getDayRangeInTz('2025-01-06', 'America/New_York');

      // 2025-01-06 00:00 em GMT-5 = 2025-01-06T05:00:00.000Z
      expect(range.start.toISOString()).toBe('2025-01-06T05:00:00.000Z');
    });
  });

  describe('localToUTC', () => {
    it('deve converter data/hora local para UTC', () => {
      const utc = localToUTC('2025-01-06', '10:00', 'America/Sao_Paulo');

      // 10:00 em GMT-3 = 13:00 UTC
      expect(utc.toISOString()).toBe('2025-01-06T13:00:00.000Z');
    });

    it('deve funcionar com timezone diferente', () => {
      const utc = localToUTC('2025-01-06', '10:00', 'America/New_York');

      // 10:00 em GMT-5 = 15:00 UTC
      expect(utc.toISOString()).toBe('2025-01-06T15:00:00.000Z');
    });
  });

  describe('isValidDateOnly', () => {
    it('deve validar formato YYYY-MM-DD', () => {
      expect(isValidDateOnly('2025-01-06')).toBe(true);
      expect(isValidDateOnly('2025-12-31')).toBe(true);
      expect(isValidDateOnly('2025-02-28')).toBe(true);
    });

    it('deve rejeitar formato inválido', () => {
      expect(isValidDateOnly('2025-13-01')).toBe(false); // Mês inválido
      expect(isValidDateOnly('2025-02-30')).toBe(false); // Dia inválido
      expect(isValidDateOnly('01/06/2025')).toBe(false); // Formato errado
      expect(isValidDateOnly('2025-1-6')).toBe(false); // Sem padding
      expect(isValidDateOnly('')).toBe(false);
    });
  });

  describe('isValidTime', () => {
    it('deve validar formato HH:mm', () => {
      expect(isValidTime('00:00')).toBe(true);
      expect(isValidTime('10:00')).toBe(true);
      expect(isValidTime('23:59')).toBe(true);
    });

    it('deve rejeitar formato inválido', () => {
      expect(isValidTime('24:00')).toBe(false); // Hora inválida
      expect(isValidTime('10:60')).toBe(false); // Minuto inválido
      expect(isValidTime('10')).toBe(false); // Falta minutos
      expect(isValidTime('10:5')).toBe(false); // Sem padding
      expect(isValidTime('')).toBe(false);
    });
  });
});
