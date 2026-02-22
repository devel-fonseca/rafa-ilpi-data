import { ApiProperty } from '@nestjs/swagger';
import { RdcIndicatorType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Max, Min } from 'class-validator';

export class QueryIndicatorReviewDto {
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

  @ApiProperty({
    description: 'Tipo do indicador RDC',
    enum: RdcIndicatorType,
  })
  @IsEnum(RdcIndicatorType)
  indicatorType: RdcIndicatorType;
}
