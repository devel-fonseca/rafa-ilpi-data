import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';

export class AdministerSOSDto {
  @ApiProperty({ description: 'ID da medicação SOS', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  sosMedicationId: string;

  @ApiProperty({ description: 'Data da administração (YYYY-MM-DD)', example: '2025-11-17' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Horário da administração (HH:mm)', example: '14:30' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário deve estar no formato HH:mm',
  })
  time: string;

  @ApiProperty({ description: 'Motivo da administração', example: 'Dor intensa no joelho direito' })
  @IsString()
  @IsNotEmpty()
  indication: string;

  @ApiProperty({ description: 'Nome do profissional que administrou', example: 'João Santos' })
  @IsString()
  @IsNotEmpty()
  administeredBy: string;

  @ApiProperty({ description: 'Observações', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
