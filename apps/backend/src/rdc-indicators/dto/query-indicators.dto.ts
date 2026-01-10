import { IsOptional, IsNumberString } from 'class-validator';
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
}
