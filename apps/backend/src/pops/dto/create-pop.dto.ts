import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator'

/**
 * DTO para criação de POP
 *
 * POPs são criados inicialmente no status DRAFT
 */
export class CreatePopDto {
  @IsString()
  @IsNotEmpty({ message: 'Título é obrigatório' })
  @MinLength(3, { message: 'Título deve ter no mínimo 3 caracteres' })
  @MaxLength(255, { message: 'Título deve ter no máximo 255 caracteres' })
  title: string

  @IsString()
  @IsNotEmpty({ message: 'Categoria é obrigatória' })
  @MaxLength(100, { message: 'Categoria deve ter no máximo 100 caracteres' })
  category: string

  @IsString()
  @IsOptional()
  @MaxLength(100, {
    message: 'ID do template deve ter no máximo 100 caracteres',
  })
  templateId?: string

  @IsString()
  @IsNotEmpty({ message: 'Conteúdo é obrigatório' })
  content: string

  @IsInt({ message: 'Intervalo de revisão deve ser um número inteiro' })
  @Min(1, { message: 'Intervalo de revisão deve ser no mínimo 1 mês' })
  @IsOptional()
  reviewIntervalMonths?: number

  @IsString()
  @IsOptional()
  notes?: string
}
