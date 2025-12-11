import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator'

/**
 * DTO para atualização de POP
 *
 * Apenas POPs em status DRAFT podem ser atualizados
 * POPs PUBLISHED requerem criação de nova versão
 */
export class UpdatePopDto {
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Título deve ter no mínimo 3 caracteres' })
  @MaxLength(255, { message: 'Título deve ter no máximo 255 caracteres' })
  title?: string

  @IsString()
  @IsOptional()
  @MinLength(10, { message: 'Conteúdo deve ter no mínimo 10 caracteres' })
  content?: string

  @IsInt({ message: 'Intervalo de revisão deve ser um número inteiro' })
  @Min(1, { message: 'Intervalo de revisão deve ser no mínimo 1 mês' })
  @IsOptional()
  reviewIntervalMonths?: number

  @IsString()
  @IsOptional()
  notes?: string
}
