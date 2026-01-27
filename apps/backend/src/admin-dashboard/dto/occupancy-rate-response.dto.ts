import { ApiProperty } from '@nestjs/swagger';

export class MonthlyOccupancyDto {
  @ApiProperty({
    description: 'Mês no formato YYYY-MM',
    example: '2025-08',
  })
  month: string;

  @ApiProperty({
    description: 'Número de residentes ativos naquele mês',
    example: 18,
  })
  residents: number;

  @ApiProperty({
    description: 'Capacidade total de leitos configurados naquele mês',
    example: 25,
  })
  capacity: number;

  @ApiProperty({
    description: 'Taxa de ocupação em percentual (0-100)',
    example: 72.0,
    nullable: true,
  })
  occupancyRate: number | null;
}

export class OccupancyRateResponseDto {
  @ApiProperty({
    description: 'Dados mensais de ocupação dos últimos 6 meses',
    type: [MonthlyOccupancyDto],
    example: [
      { month: '2025-08', residents: 12, capacity: 20, occupancyRate: 60.0 },
      { month: '2025-09', residents: 15, capacity: 20, occupancyRate: 75.0 },
      { month: '2025-10', residents: 17, capacity: 25, occupancyRate: 68.0 },
      { month: '2025-11', residents: 16, capacity: 25, occupancyRate: 64.0 },
      { month: '2025-12', residents: 18, capacity: 25, occupancyRate: 72.0 },
      { month: '2026-01', residents: 20, capacity: 25, occupancyRate: 80.0 },
    ],
  })
  data: MonthlyOccupancyDto[];

  @ApiProperty({
    description: 'Indica se o tenant tem leitos configurados no sistema',
    example: true,
  })
  hasBedsConfigured: boolean;
}
