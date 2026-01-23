// ──────────────────────────────────────────────────────────────────────────────
// DTO - BulkCreateShiftsDto (Criação em Lote de Plantões)
// ──────────────────────────────────────────────────────────────────────────────

import { IsArray, IsDateString, IsUUID, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ShiftAssignmentDto {
  @ApiProperty({
    description: 'Data do plantão (YYYY-MM-DD)',
    example: '2026-01-23',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'ID do shift template',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  shiftTemplateId: string;

  @ApiProperty({
    description: 'ID da equipe designada',
    example: 'f9e8d7c6-b5a4-3210-fedc-ba0987654321',
  })
  @IsUUID()
  teamId: string;
}

export class BulkCreateShiftsDto {
  @ApiProperty({
    description: 'Lista de plantões a serem criados',
    type: [ShiftAssignmentDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShiftAssignmentDto)
  shifts: ShiftAssignmentDto[];
}
