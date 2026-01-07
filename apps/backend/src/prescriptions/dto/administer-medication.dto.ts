import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  Matches,
} from 'class-validator';
import { IsDateOnly } from '../../common/validators/date.validators';

export class AdministerMedicationDto {
  @ApiProperty({ description: 'ID do medicamento', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  medicationId: string;

  @ApiProperty({ description: 'Data da administração (YYYY-MM-DD)', example: '2025-11-17' })
  @IsDateOnly()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Horário programado (HH:mm)', example: '08:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário deve estar no formato HH:mm',
  })
  scheduledTime: string;

  @ApiProperty({ description: 'Horário real de administração (HH:mm)', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário deve estar no formato HH:mm',
  })
  actualTime?: string;

  @ApiProperty({ description: 'Medicamento foi administrado', example: true })
  @IsBoolean()
  @IsNotEmpty()
  wasAdministered: boolean;

  @ApiProperty({ description: 'Motivo de não administração', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ description: 'Nome do profissional que administrou', example: 'Ana Silva' })
  @IsString()
  @IsNotEmpty()
  administeredBy: string;

  @ApiProperty({ description: 'Nome do profissional que checou (dupla checagem)', required: false })
  @IsString()
  @IsOptional()
  checkedBy?: string;

  @ApiProperty({ description: 'ID do usuário que checou', required: false })
  @IsUUID()
  @IsOptional()
  checkedByUserId?: string;

  @ApiProperty({ description: 'Observações', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
