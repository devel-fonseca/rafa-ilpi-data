import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  Min,
  Max,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class CreatePatternAssignmentDto {
  @ApiProperty({
    description: 'Número da semana no ciclo (0-3). 0 = primeira semana',
    example: 0,
    minimum: 0,
    maximum: 3,
    default: 0,
    required: false,
  })
  @IsInt({ message: 'weekNumber deve ser um número inteiro' })
  @Min(0, { message: 'weekNumber deve ser no mínimo 0' })
  @Max(3, { message: 'weekNumber deve ser no máximo 3' })
  @IsOptional()
  weekNumber?: number = 0;

  @ApiProperty({
    description: 'Dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsInt({ message: 'dayOfWeek deve ser um número inteiro' })
  @Min(0, { message: 'dayOfWeek deve ser no mínimo 0 (Domingo)' })
  @Max(6, { message: 'dayOfWeek deve ser no máximo 6 (Sábado)' })
  dayOfWeek: number;

  @ApiProperty({
    description: 'ID do turno fixo (ShiftTemplate)',
    example: 'uuid-do-turno',
  })
  @IsUUID('4', { message: 'shiftTemplateId deve ser um UUID válido' })
  shiftTemplateId: string;

  @ApiProperty({
    description: 'ID da equipe a ser designada (opcional)',
    example: 'uuid-da-equipe',
    required: false,
  })
  @IsUUID('4', { message: 'teamId deve ser um UUID válido' })
  @IsOptional()
  teamId?: string;
}
