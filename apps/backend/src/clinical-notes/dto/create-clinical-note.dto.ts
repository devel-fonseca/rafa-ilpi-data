import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  IsDateString,
  ValidateIf,
} from 'class-validator'
import { ClinicalProfession } from '@prisma/client'

/**
 * DTO para criação de evolução clínica (SOAP)
 *
 * Regras de validação:
 * - Ao menos 1 campo SOAP (S, O, A ou P) deve ser preenchido
 * - Tags são opcionais e podem ser array vazio
 * - noteDate é opcional (default: now())
 */
export class CreateClinicalNoteDto {
  @IsUUID('4')
  residentId: string

  @IsEnum(ClinicalProfession)
  profession: ClinicalProfession

  @IsOptional()
  @IsDateString()
  noteDate?: string // ISO 8601 format

  // Campos SOAP (ao menos 1 deve ser preenchido)
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.subjective || o.objective || o.assessment || o.plan)
  subjective?: string

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.subjective || o.objective || o.assessment || o.plan)
  objective?: string

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.subjective || o.objective || o.assessment || o.plan)
  assessment?: string

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.subjective || o.objective || o.assessment || o.plan)
  plan?: string

  // Tags para filtros
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]
}
