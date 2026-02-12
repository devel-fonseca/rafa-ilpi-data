import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsDateOnly } from '../../common/validators/date.validators';

export class GenerateContractTransactionsDto {
  @ApiPropertyOptional({
    description: 'Mês de competência no formato YYYY-MM-DD (normalmente dia 01). Se omitido, usa o mês atual do tenant.',
    example: '2026-02-01',
  })
  @IsOptional()
  @IsDateOnly()
  competenceMonth?: string;
}

