import { ApiProperty } from '@nestjs/swagger';
import { RdcIndicatorType } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewIndicatorDecisionDto {
  @ApiProperty({
    description: 'ID da intercorrência candidata',
    format: 'uuid',
  })
  @IsUUID()
  incidentId: string;

  @ApiProperty({
    description: 'Decisão do caso para composição do indicador',
    enum: ['CONFIRMED', 'DISCARDED', 'PENDING'],
  })
  @IsIn(['CONFIRMED', 'DISCARDED', 'PENDING'])
  decision: 'CONFIRMED' | 'DISCARDED' | 'PENDING';

  @ApiProperty({
    description: 'Motivo da decisão (obrigatório para descarte)',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReviewIndicatorCasesDto {
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

  @ApiProperty({
    description: 'Lista de decisões de casos',
    type: [ReviewIndicatorDecisionDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReviewIndicatorDecisionDto)
  decisions: ReviewIndicatorDecisionDto[];
}
