import { IsOptional, IsDateString, IsUUID, IsArray, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum ContentFilterType {
  // Medicamentos
  MEDICATIONS = 'medications',

  // Agendamentos pontuais
  VACCINATIONS = 'vaccinations',
  CONSULTATIONS = 'consultations',
  EXAMS = 'exams',
  PROCEDURES = 'procedures',
  OTHER_EVENTS = 'other_events',

  // Registros obrigatórios recorrentes
  HYGIENE = 'hygiene',
  FEEDING = 'feeding',
  HYDRATION = 'hydration',
  WEIGHT = 'weight',
  MONITORING = 'monitoring',
  ELIMINATION = 'elimination',
  BEHAVIOR = 'behavior',
  SLEEP = 'sleep',
  ACTIVITIES = 'activities',
  VISITS = 'visits',
  OTHER_RECORDS = 'other_records',
}

export enum StatusFilterType {
  ALL = 'all',
  PENDING = 'pending',
  COMPLETED = 'completed',
  MISSED = 'missed',
  CANCELLED = 'cancelled',
}

export class GetAgendaItemsDto {
  /**
   * Single date query (legacy/retrocompatível)
   * Usado para visualização diária
   * Formato: YYYY-MM-DD
   */
  @IsOptional()
  @IsDateString()
  date?: string;

  /**
   * Range query - data inicial
   * Usado para visualizações semanal/mensal
   * Formato: YYYY-MM-DD
   */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /**
   * Range query - data final
   * Usado para visualizações semanal/mensal
   * Formato: YYYY-MM-DD
   */
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  residentId?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',');
    }
    return value;
  })
  @IsEnum(ContentFilterType, { each: true })
  filters?: ContentFilterType[];

  /**
   * Filtro por status do item
   * all = todos os status
   * pending = apenas pendentes
   * completed = apenas concluídos
   * missed = apenas perdidos
   * cancelled = apenas cancelados
   */
  @IsOptional()
  @IsEnum(StatusFilterType)
  statusFilter?: StatusFilterType;
}
