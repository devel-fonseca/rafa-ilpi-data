import { IsString, IsOptional, MaxLength } from 'class-validator'

/**
 * DTO para adicionar anexo a um POP
 *
 * Metadados opcionais para categorização e descrição de anexos
 */
export class AddAttachmentDto {
  @IsString()
  @IsOptional()
  @MaxLength(255, {
    message: 'Descrição do anexo deve ter no máximo 255 caracteres',
  })
  description?: string

  @IsString()
  @IsOptional()
  @MaxLength(50, {
    message: 'Tipo do anexo deve ter no máximo 50 caracteres',
  })
  type?: string // FORMULARIO, CHECKLIST, FLUXOGRAMA, ANEXO_TECNICO, etc.
}
