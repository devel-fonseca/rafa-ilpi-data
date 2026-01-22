import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDateOnly } from '../../common/validators/date.validators';

export class CreateShiftDto {
  @ApiProperty({
    description: 'Data do plantão (YYYY-MM-DD)',
    example: '2026-01-21',
  })
  @IsDateOnly()
  date: string;

  @ApiProperty({
    description: 'ID do turno fixo (ShiftTemplate)',
    example: 'uuid-do-turno',
  })
  @IsUUID('4', { message: 'shiftTemplateId deve ser um UUID válido' })
  shiftTemplateId: string;

  @ApiProperty({
    description: 'ID da equipe designada (opcional)',
    example: 'uuid-da-equipe',
    required: false,
  })
  @IsUUID('4', { message: 'teamId deve ser um UUID válido' })
  @IsOptional()
  teamId?: string;

  @ApiProperty({
    description: 'Observações sobre o plantão (opcional)',
    example: 'Plantão extra devido a evento especial',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'notes deve ter no máximo 500 caracteres' })
  notes?: string;
}
