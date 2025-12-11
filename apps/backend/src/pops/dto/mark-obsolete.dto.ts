import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator'

/**
 * DTO para marcar POP como obsoleto
 *
 * Transiciona POP de PUBLISHED para OBSOLETE
 * Requer motivo obrigatório para auditoria
 */
export class MarkObsoleteDto {
  @IsString()
  @IsNotEmpty({ message: 'Motivo é obrigatório' })
  @MinLength(10, { message: 'Motivo deve ter no mínimo 10 caracteres' })
  @MaxLength(500, { message: 'Motivo deve ter no máximo 500 caracteres' })
  reason: string
}
