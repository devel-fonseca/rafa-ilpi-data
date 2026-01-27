import { ApiProperty } from '@nestjs/swagger';

export class MonthlyResidentCountDto {
  @ApiProperty({
    description: 'Mês no formato YYYY-MM',
    example: '2025-08',
  })
  month: string;

  @ApiProperty({
    description: 'Número de residentes ativos naquele mês',
    example: 12,
  })
  count: number;
}

export class ResidentsGrowthResponseDto {
  @ApiProperty({
    description: 'Dados mensais dos últimos 6 meses',
    type: [MonthlyResidentCountDto],
    example: [
      { month: '2025-08', count: 12 },
      { month: '2025-09', count: 15 },
      { month: '2025-10', count: 17 },
      { month: '2025-11', count: 16 },
      { month: '2025-12', count: 18 },
      { month: '2026-01', count: 20 },
    ],
  })
  data: MonthlyResidentCountDto[];
}
