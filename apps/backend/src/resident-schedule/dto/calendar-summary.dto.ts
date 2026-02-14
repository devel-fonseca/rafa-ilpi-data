import { IsOptional, IsDateString, IsUUID, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para requisição de sumário do calendário (visualização mensal otimizada)
 *
 * Retorna apenas agregados por dia ao invés de itens completos
 * Usado para renderizar o calendário mensal sem carregar todos os detalhes
 */
export class GetCalendarSummaryDto {
  /**
   * Data inicial do intervalo
   * Formato: YYYY-MM-DD
   */
  @IsDateString()
  startDate: string;

  /**
   * Data final do intervalo
   * Formato: YYYY-MM-DD
   */
  @IsDateString()
  endDate: string;

  /**
   * Filtrar por residente específico (opcional)
   * Se não informado, retorna agregados de todos os residentes
   */
  @IsOptional()
  @IsUUID()
  residentId?: string;

  /**
   * Filtros de tipo de conteúdo (opcional)
   * Se não informado, considera todos os tipos
   */
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',');
    }
    return value;
  })
  filters?: string[];
}

/**
 * Agregados de itens para um dia específico
 */
export interface DaySummary {
  /**
   * Data no formato YYYY-MM-DD
   */
  date: string;

  /**
   * Total de itens neste dia
   */
  totalItems: number;

  /**
   * Breakdown por status
   */
  statusBreakdown: {
    pending: number;
    completed: number;
    missed: number;
    canceled: number;
  };

  /**
   * Breakdown por categoria
   */
  categoryBreakdown: {
    medications: number;
    vaccinations: number;
    consultations: number;
    exams: number;
    procedures: number;
    feeding: number;
    hygiene: number;
    hydration: number;
    weight: number;
    monitoring: number;
    other: number;
  };

  /**
   * Flags indicando presença de cada tipo
   */
  has: {
    medications: boolean;
    events: boolean;
    records: boolean;
  };
}

/**
 * Response do calendar summary
 */
export interface CalendarSummaryResponse {
  /**
   * Sumários organizados por dia
   * Chave: data no formato YYYY-MM-DD
   */
  days: Record<string, DaySummary>;

  /**
   * Estatísticas gerais do período
   */
  totals: {
    totalItems: number;
    totalDaysWithItems: number;
    statusBreakdown: {
      pending: number;
      completed: number;
      missed: number;
      canceled: number;
    };
  };
}
