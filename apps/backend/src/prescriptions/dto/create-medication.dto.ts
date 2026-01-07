import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { IsDateOnly } from '../../common/validators/date.validators';

export class CreateMedicationDto {
  @ApiProperty({ description: 'Nome do medicamento (DCB)', example: 'Losartana Potássica' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: ['COMPRIMIDO', 'CAPSULA', 'AMPOLA', 'GOTAS', 'SOLUCAO', 'SUSPENSAO', 'POMADA', 'CREME', 'SPRAY', 'INALADOR', 'ADESIVO', 'SUPOSITORIO', 'OUTRO'],
    description: 'Apresentação do medicamento',
    example: 'COMPRIMIDO',
  })
  @IsEnum(['COMPRIMIDO', 'CAPSULA', 'AMPOLA', 'GOTAS', 'SOLUCAO', 'SUSPENSAO', 'POMADA', 'CREME', 'SPRAY', 'INALADOR', 'ADESIVO', 'SUPOSITORIO', 'OUTRO'])
  @IsNotEmpty()
  presentation: string;

  @ApiProperty({ description: 'Concentração', example: '50mg' })
  @IsString()
  @IsNotEmpty()
  concentration: string;

  @ApiProperty({ description: 'Dose prescrita', example: '1 cp' })
  @IsString()
  @IsNotEmpty()
  dose: string;

  @ApiProperty({
    enum: ['VO', 'IM', 'EV', 'SC', 'TOPICA', 'SL', 'RETAL', 'OCULAR', 'NASAL', 'INALATORIA', 'OUTRA'],
    description: 'Via de administração',
    example: 'VO',
  })
  @IsEnum(['VO', 'IM', 'EV', 'SC', 'TOPICA', 'SL', 'RETAL', 'OCULAR', 'NASAL', 'INALATORIA', 'OUTRA'])
  @IsNotEmpty()
  route: string;

  @ApiProperty({
    enum: ['UMA_VEZ_DIA', 'DUAS_VEZES_DIA', 'SEIS_SEIS_H', 'OITO_OITO_H', 'DOZE_DOZE_H', 'PERSONALIZADO'],
    description: 'Frequência de administração',
    example: 'UMA_VEZ_DIA',
  })
  @IsEnum(['UMA_VEZ_DIA', 'DUAS_VEZES_DIA', 'SEIS_SEIS_H', 'OITO_OITO_H', 'DOZE_DOZE_H', 'PERSONALIZADO'])
  @IsNotEmpty()
  frequency: string;

  @ApiProperty({
    description: 'Horários programados',
    example: ['08:00', '20:00'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  scheduledTimes: string[];

  @ApiProperty({ description: 'Data de início (YYYY-MM-DD)', example: '2025-11-17' })
  @IsDateOnly()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Data de término (YYYY-MM-DD)', example: '2025-11-27', required: false })
  @IsDateOnly()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Medicamento controlado', example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isControlled?: boolean;

  @ApiProperty({ description: 'Medicamento de alto risco', example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isHighRisk?: boolean;

  @ApiProperty({ description: 'Requer dupla checagem', example: false, default: false })
  @IsBoolean()
  @IsOptional()
  requiresDoubleCheck?: boolean;

  @ApiProperty({ description: 'Instruções de administração', required: false })
  @IsString()
  @IsOptional()
  instructions?: string;
}
