import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateMedicationAdministrationDto {
  @ApiProperty({ description: 'Horário real de administração (HH:mm)', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário deve estar no formato HH:mm',
  })
  actualTime?: string;

  @ApiProperty({ description: 'Medicamento foi administrado', required: false })
  @IsBoolean()
  @IsOptional()
  wasAdministered?: boolean;

  @ApiProperty({ description: 'Motivo de não administração', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ description: 'Observações', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Motivo da edição (auditoria)', required: true })
  @IsString()
  @MinLength(10, { message: 'Motivo da edição deve ter pelo menos 10 caracteres' })
  editReason: string;
}

export class DeleteMedicationAdministrationDto {
  @ApiProperty({ description: 'Motivo da exclusão (auditoria)', required: true })
  @IsString()
  @MinLength(10, { message: 'Motivo da exclusão deve ter pelo menos 10 caracteres' })
  deleteReason: string;
}
