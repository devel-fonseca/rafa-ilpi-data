import { IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * DTO para decisão clínica sobre alerta de sinal vital.
 *
 * Fluxo:
 * - Confirmar intercorrência: gera registro de INTERCORRENCIA a partir do alerta
 * - Descartar intercorrência: mantém apenas o alerta (status IGNORED)
 */
export class DecideVitalSignAlertIncidentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  medicalNotes?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  actionTaken?: string
}
