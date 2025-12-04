import { IsString, MinLength } from 'class-validator'

/**
 * DTO para soft delete de evolução clínica
 *
 * Regras de validação:
 * - deleteReason é OBRIGATÓRIO (min 10 caracteres)
 *
 * Validações de negócio (no service):
 * - Apenas usuários com permissão DELETE_CLINICAL_NOTES podem excluir
 * - Marca isAmended = true
 * - Cria versão final no histórico
 */
export class DeleteClinicalNoteDto {
  @IsString()
  @MinLength(10, { message: 'Motivo da exclusão deve ter no mínimo 10 caracteres' })
  deleteReason: string
}
