import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { IsDateOnly } from '../../common/validators/date.validators';

export class RDCCalculationQueryDto {
  @ApiProperty({
    description: 'Data para cálculo (YYYY-MM-DD)',
    example: '2026-01-21',
  })
  @IsDateOnly()
  date: string;

  @ApiProperty({
    description: 'ID do turno específico (opcional, calcula para todos se não fornecido)',
    example: 'uuid-do-turno',
    required: false,
  })
  @IsUUID('4', { message: 'shiftTemplateId deve ser um UUID válido' })
  @IsOptional()
  shiftTemplateId?: string;
}
