import {
  IsOptional,
  IsString,
  IsArray,
  MinLength,
  ValidateIf,
} from 'class-validator'

/**
 * DTO para atualização de evolução clínica (SOAP)
 *
 * Regras de validação:
 * - editReason é OBRIGATÓRIO (min 10 caracteres)
 * - Ao menos 1 campo SOAP deve ser atualizado
 * - Tags podem ser atualizadas
 *
 * Validações de negócio (no service):
 * - Apenas o autor pode editar
 * - Janela de edição de 12 horas (verificar editableUntil)
 */
export class UpdateClinicalNoteDto {
  // Motivo da edição (OBRIGATÓRIO)
  @IsString()
  @MinLength(10, { message: 'Motivo da edição deve ter no mínimo 10 caracteres' })
  editReason: string

  // Campos SOAP (todos opcionais, mas ao menos 1 deve ser enviado)
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.subjective || o.objective || o.assessment || o.plan || o.tags)
  subjective?: string

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.subjective || o.objective || o.assessment || o.plan || o.tags)
  objective?: string

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.subjective || o.objective || o.assessment || o.plan || o.tags)
  assessment?: string

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.subjective || o.objective || o.assessment || o.plan || o.tags)
  plan?: string

  // Tags (opcional)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]
}
