// ──────────────────────────────────────────────────────────────────────────────
//  DTO - Available Shift Template (para filtros de relatórios)
// ──────────────────────────────────────────────────────────────────────────────

import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO simplificado com templates disponíveis para uso em filtros
 * Retorna apenas templates ativos e habilitados para o tenant
 */
export class AvailableShiftTemplateDto {
  @ApiProperty({
    description: 'ID do template',
    example: 'uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Tipo do template',
    example: 'DAY_8H',
    enum: ['DAY_8H', 'AFTERNOON_8H', 'NIGHT_8H', 'DAY_12H', 'NIGHT_12H'],
  })
  type: string;

  @ApiProperty({
    description: 'Nome do turno (customizado ou padrão)',
    example: 'Cuidadores Manhã',
  })
  name: string;

  @ApiProperty({
    description: 'Horário de início',
    example: '07:00',
  })
  startTime: string;

  @ApiProperty({
    description: 'Horário de término',
    example: '15:00',
  })
  endTime: string;

  @ApiProperty({
    description: 'Duração em horas',
    example: 8,
  })
  duration: number;

  @ApiProperty({
    description: 'Ordem de exibição',
    example: 1,
  })
  displayOrder: number;
}
