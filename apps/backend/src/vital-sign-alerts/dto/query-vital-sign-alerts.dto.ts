import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator'
import {
  VitalSignAlertType,
  AlertSeverity,
  AlertStatus,
} from '@prisma/client'

/**
 * DTO para consulta/filtro de alertas médicos
 *
 * Permite filtrar por:
 * - Residente
 * - Status
 * - Tipo e severidade
 * - Período
 * - Profissional atribuído
 */
export class QueryVitalSignAlertsDto {
  @IsOptional()
  @IsUUID('4')
  residentId?: string

  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus

  @IsOptional()
  @IsEnum(VitalSignAlertType)
  type?: VitalSignAlertType

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity

  @IsOptional()
  @IsUUID('4')
  assignedTo?: string

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
