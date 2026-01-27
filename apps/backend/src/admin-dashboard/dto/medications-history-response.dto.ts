import { ApiProperty } from '@nestjs/swagger';

export class DailyMedicationStatsDto {
  @ApiProperty({
    description: 'Data no formato YYYY-MM-DD',
    example: '2026-01-21',
  })
  day: string;

  @ApiProperty({
    description: 'Número de medicações agendadas neste dia',
    example: 45,
  })
  scheduled: number;

  @ApiProperty({
    description: 'Número de medicações administradas neste dia',
    example: 48,
  })
  administered: number;
}

export class MedicationsHistoryResponseDto {
  @ApiProperty({
    description: 'Dados diários dos últimos 7 dias',
    type: [DailyMedicationStatsDto],
    example: [
      { day: '2026-01-21', scheduled: 45, administered: 48 },
      { day: '2026-01-22', scheduled: 50, administered: 52 },
      { day: '2026-01-23', scheduled: 48, administered: 50 },
      { day: '2026-01-24', scheduled: 52, administered: 54 },
      { day: '2026-01-25', scheduled: 50, administered: 53 },
      { day: '2026-01-26', scheduled: 51, administered: 50 },
      { day: '2026-01-27', scheduled: 30, administered: 32 },
    ],
  })
  data: DailyMedicationStatsDto[];
}
