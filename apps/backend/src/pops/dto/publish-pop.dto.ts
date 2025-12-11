import { IsString, IsOptional, MaxLength } from 'class-validator'

/**
 * DTO para publicação de POP
 *
 * Transiciona POP de DRAFT para PUBLISHED
 * Apenas RT pode publicar POPs
 */
export class PublishPopDto {
  @IsString()
  @IsOptional()
  @MaxLength(500, {
    message: 'Observações de publicação devem ter no máximo 500 caracteres',
  })
  publicationNotes?: string
}
