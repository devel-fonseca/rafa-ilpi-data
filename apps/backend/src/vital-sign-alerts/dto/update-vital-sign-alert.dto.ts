import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator'
import { AlertStatus } from '@prisma/client'

/**
 * DTO para atualização de alerta médico
 *
 * Permite atualizar:
 * - Status do alerta (ACTIVE → IN_TREATMENT → RESOLVED)
 * - Atribuição a profissional
 * - Notas médicas e ações tomadas
 */
export class UpdateVitalSignAlertDto {
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus

  @IsOptional()
  @ValidateIf((o) => o.assignedTo !== null && o.assignedTo !== '')
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  assignedTo?: string | null

  @IsOptional()
  @ValidateIf((o) => o.medicalNotes !== null && o.medicalNotes !== '')
  @IsString()
  medicalNotes?: string | null

  @IsOptional()
  @ValidateIf((o) => o.actionTaken !== null && o.actionTaken !== '')
  @IsString()
  actionTaken?: string | null
}
