import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsObject,
} from 'class-validator'
import {
  VitalSignAlertType,
  AlertSeverity,
  AlertStatus,
} from '@prisma/client'

/**
 * DTO para criação de alerta médico de sinal vital
 *
 * Este DTO é usado pelo sistema para criar alertas automaticamente
 * quando detecta sinais vitais anormais.
 */
export class CreateVitalSignAlertDto {
  @IsUUID('4')
  @IsNotEmpty()
  residentId: string

  @IsUUID('4')
  @IsNotEmpty()
  vitalSignId: string

  @IsOptional()
  @IsUUID('4')
  notificationId?: string

  @IsEnum(VitalSignAlertType)
  @IsNotEmpty()
  type: VitalSignAlertType

  @IsEnum(AlertSeverity)
  @IsNotEmpty()
  severity: AlertSeverity

  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsNotEmpty()
  description: string

  @IsString()
  @IsNotEmpty()
  value: string // Ex: "175/98 mmHg", "280 mg/dL"

  @IsObject()
  @IsNotEmpty()
  metadata: Record<string, any> // { threshold, expectedRange, detectedAt, etc }

  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  priority?: number

  @IsOptional()
  @IsUUID('4')
  assignedTo?: string
}
