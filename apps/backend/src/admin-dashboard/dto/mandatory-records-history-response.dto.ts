import { ApiProperty } from '@nestjs/swagger';

export class DailyRecordStatsDto {
  @ApiProperty({
    description: 'Data no formato YYYY-MM-DD',
    example: '2026-01-21',
  })
  day: string;

  @ApiProperty({
    description: 'Número de registros obrigatórios esperados neste dia',
    example: 35,
  })
  expected: number;

  @ApiProperty({
    description: 'Número de registros completados neste dia',
    example: 32,
  })
  completed: number;
}

export class MandatoryRecordsHistoryResponseDto {
  @ApiProperty({
    description: 'Dados diários dos últimos 7 dias',
    type: [DailyRecordStatsDto],
    example: [
      { day: '2026-01-21', expected: 35, completed: 32 },
      { day: '2026-01-22', expected: 36, completed: 35 },
      { day: '2026-01-23', expected: 34, completed: 33 },
      { day: '2026-01-24', expected: 38, completed: 36 },
      { day: '2026-01-25', expected: 35, completed: 34 },
      { day: '2026-01-26', expected: 37, completed: 35 },
      { day: '2026-01-27', expected: 20, completed: 18 },
    ],
  })
  data: DailyRecordStatsDto[];
}
