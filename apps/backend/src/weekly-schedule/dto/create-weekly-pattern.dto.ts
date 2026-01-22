import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateWeeklyPatternDto {
  @ApiProperty({
    description: 'Nome do padrão semanal',
    example: 'Escala Padrão Janeiro 2026',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome do padrão é obrigatório' })
  @MinLength(3, { message: 'O nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Descrição do padrão (opcional)',
    example: 'Escala recorrente para o mês de janeiro',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres' })
  description?: string;

  @ApiProperty({
    description: 'Data de início do padrão (YYYY-MM-DD)',
    example: '2026-01-21',
  })
  @IsDateString(
    {},
    { message: 'startDate deve ser uma data válida (YYYY-MM-DD)' },
  )
  startDate: string;

  @ApiProperty({
    description: 'Data de término do padrão (YYYY-MM-DD) - opcional',
    example: '2026-02-21',
    required: false,
  })
  @IsDateString(
    {},
    { message: 'endDate deve ser uma data válida (YYYY-MM-DD)' },
  )
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description:
      'Número de semanas no ciclo (1-4). 1=semanal, 2=quinzenal, 3=tri-semanal, 4=mensal',
    example: 1,
    minimum: 1,
    maximum: 4,
    default: 1,
    required: false,
  })
  @IsInt({ message: 'numberOfWeeks deve ser um número inteiro' })
  @Min(1, { message: 'numberOfWeeks deve ser no mínimo 1' })
  @Max(4, { message: 'numberOfWeeks deve ser no máximo 4' })
  @IsOptional()
  numberOfWeeks?: number = 1;
}
