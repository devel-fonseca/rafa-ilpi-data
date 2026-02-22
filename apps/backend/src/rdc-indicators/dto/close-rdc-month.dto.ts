import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CloseRdcMonthDto {
  @ApiProperty({ description: 'Ano de referência', example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({ description: 'Mês de referência (1-12)', example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({
    description: 'Observação de fechamento do período',
    example: 'Indicadores revisados e fechados para envio anual.',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  note?: string;
}
