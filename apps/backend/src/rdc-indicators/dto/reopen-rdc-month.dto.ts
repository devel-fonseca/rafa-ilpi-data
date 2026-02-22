import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class ReopenRdcMonthDto {
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
    description: 'Motivo da reabertura do período (obrigatório para auditoria)',
    example: 'Inclusão de caso confirmado após revisão clínica tardia.',
  })
  @IsString()
  @MinLength(5)
  reason: string;
}
