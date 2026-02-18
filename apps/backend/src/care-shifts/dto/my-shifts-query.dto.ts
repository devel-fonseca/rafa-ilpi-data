import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsDateOnly } from '../../common/validators/date.validators';

export class MyShiftsQueryDto {
  @ApiPropertyOptional({
    description: 'Data inicial do período (YYYY-MM-DD). Padrão: hoje - 30 dias',
    example: '2026-02-01',
  })
  @IsDateOnly()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data final do período (YYYY-MM-DD). Padrão: hoje + 30 dias',
    example: '2026-03-31',
  })
  @IsDateOnly()
  @IsOptional()
  endDate?: string;
}
