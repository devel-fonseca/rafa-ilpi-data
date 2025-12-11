import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator'

/**
 * DTO para criação de nova versão de POP
 *
 * Cria uma nova versão a partir de um POP PUBLISHED existente
 * O POP anterior será marcado como OBSOLETE
 */
export class CreatePopVersionDto {
  @IsString()
  @IsNotEmpty({ message: 'Motivo da revisão é obrigatório' })
  @MinLength(10, {
    message: 'Motivo da revisão deve ter no mínimo 10 caracteres',
  })
  @MaxLength(500, {
    message: 'Motivo da revisão deve ter no máximo 500 caracteres',
  })
  reason: string

  @IsString()
  @IsNotEmpty({ message: 'Novo conteúdo é obrigatório' })
  @MinLength(10, { message: 'Conteúdo deve ter no mínimo 10 caracteres' })
  newContent: string

  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Título deve ter no mínimo 3 caracteres' })
  @MaxLength(255, { message: 'Título deve ter no máximo 255 caracteres' })
  newTitle?: string

  @IsInt({ message: 'Intervalo de revisão deve ser um número inteiro' })
  @Min(1, { message: 'Intervalo de revisão deve ser no mínimo 1 mês' })
  @IsOptional()
  newReviewIntervalMonths?: number

  @IsString()
  @IsOptional()
  newNotes?: string
}
