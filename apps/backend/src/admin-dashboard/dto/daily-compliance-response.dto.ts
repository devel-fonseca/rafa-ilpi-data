import { ApiProperty } from '@nestjs/swagger';

export class DailyComplianceResponseDto {
  @ApiProperty({
    description: 'Número de residentes ativos',
    example: 42,
  })
  activeResidents: number;

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
    description: 'Registros obrigatórios esperados vs. realizados',
    example: {
      expected: 84,
      completed: 78,
    },
  })
  mandatoryRecords: {
    expected: number;
    completed: number;
  };
}
