import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import {
  InstitutionalEventType,
  InstitutionalEventVisibility,
  ScheduledEventStatus,
} from '@prisma/client';

/**
 * DTO para buscar eventos institucionais com filtros
 *
 * Suporta dois modos de consulta por data:
 * 1. Single date: Fornece apenas `date` (YYYY-MM-DD)
 * 2. Range query: Fornece `startDate` e `endDate` (YYYY-MM-DD)
 */
export class GetInstitutionalEventsDto {
  @IsOptional()
  @IsEnum(InstitutionalEventType)
  eventType?: InstitutionalEventType;

  @IsOptional()
  @IsEnum(InstitutionalEventVisibility)
  visibility?: InstitutionalEventVisibility;

  @IsOptional()
  @IsEnum(ScheduledEventStatus)
  status?: ScheduledEventStatus;

  /**
   * Data única para buscar eventos (formato YYYY-MM-DD)
   * Se informado, ignora startDate/endDate
   */
  @IsOptional()
  @IsDateString()
  date?: string;

  /**
   * Data inicial do intervalo (formato YYYY-MM-DD)
   * Usado em conjunto com endDate
   */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /**
   * Data final do intervalo (formato YYYY-MM-DD)
   * Usado em conjunto com startDate
   */
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
