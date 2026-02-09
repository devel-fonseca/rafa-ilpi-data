import { ApiProperty } from '@nestjs/swagger';

export class DailyComplianceResponseDto {
  @ApiProperty({
    description: 'Número total de residentes ativos',
    example: 42,
  })
  activeResidents: number;

  @ApiProperty({
    description: 'Número de residentes ativos com rotinas programadas',
    example: 38,
  })
  residentsWithSchedules: number;

  @ApiProperty({
    description: 'Estatísticas de medicamentos',
    example: {
      scheduled: 120,
      administered: 115,
      total: 120,
    },
  })
  medications: {
    scheduled: number;
    administered: number;
    total: number;
  };

  @ApiProperty({
    description: 'Registros programados esperados vs. realizados',
    example: {
      expected: 84,
      completed: 78,
    },
  })
  scheduledRecords: {
    expected: number;
    completed: number;
  };

  @ApiProperty({
    description: '[DEPRECATED] Use scheduledRecords',
    example: {
      expected: 84,
      completed: 78,
    },
    required: false,
  })
  mandatoryRecords: {
    expected: number;
    completed: number;
  };
}
