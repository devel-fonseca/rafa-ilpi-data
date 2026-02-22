import { IsOptional, IsNumberString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryIndicatorsDto {
  @ApiPropertyOptional({
    description: 'Ano (ex: 2026)',
    example: 2026,
  })
  @IsOptional()
  @IsNumberString()
  year?: string;

  @ApiPropertyOptional({
    description: 'Mês (1-12)',
    example: 1,
  })
  @IsOptional()
  @IsNumberString()
  month?: string;

  @ApiPropertyOptional({
    description: 'Quantidade de meses para histórico (1-24)',
    example: 12,
    minimum: 1,
    maximum: 24,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(24)
  months?: number;
}
