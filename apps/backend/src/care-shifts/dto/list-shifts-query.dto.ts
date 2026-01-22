import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { IsDateOnly } from '../../common/validators/date.validators';

export class ListShiftsQueryDto {
  @ApiProperty({
    description: 'Data inicial do período (YYYY-MM-DD)',
    example: '2026-01-21',
  })
  @IsDateOnly()
  startDate: string;

  @ApiProperty({
    description: 'Data final do período (YYYY-MM-DD)',
    example: '2026-02-04',
  })
  @IsDateOnly()
  endDate: string;

  @ApiProperty({
    description: 'Filtrar por turno específico (opcional)',
    example: 'uuid-do-turno',
    required: false,
  })
  @IsUUID('4', { message: 'shiftTemplateId deve ser um UUID válido' })
  @IsOptional()
  shiftTemplateId?: string;

  @ApiProperty({
    description: 'Filtrar por equipe específica (opcional)',
    example: 'uuid-da-equipe',
    required: false,
  })
  @IsUUID('4', { message: 'teamId deve ser um UUID válido' })
  @IsOptional()
  teamId?: string;
}
