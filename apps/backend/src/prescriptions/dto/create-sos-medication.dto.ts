import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class CreateSOSMedicationDto {
  @ApiProperty({ description: 'Nome do medicamento', example: 'Dipirona' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: ['COMPRIMIDO', 'CAPSULA', 'AMPOLA', 'GOTAS', 'SOLUCAO', 'SUSPENSAO', 'POMADA', 'CREME', 'SPRAY', 'INALADOR', 'ADESIVO', 'SUPOSITORIO', 'OUTRO'],
    description: 'Apresentação do medicamento',
    example: 'GOTAS',
  })
  @IsEnum(['COMPRIMIDO', 'CAPSULA', 'AMPOLA', 'GOTAS', 'SOLUCAO', 'SUSPENSAO', 'POMADA', 'CREME', 'SPRAY', 'INALADOR', 'ADESIVO', 'SUPOSITORIO', 'OUTRO'])
  @IsNotEmpty()
  presentation: string;

  @ApiProperty({ description: 'Concentração', example: '500mg/mL' })
  @IsString()
  @IsNotEmpty()
  concentration: string;

  @ApiProperty({ description: 'Dose prescrita', example: '40 gotas' })
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
    enum: ['DOR', 'FEBRE', 'ANSIEDADE', 'AGITACAO', 'NAUSEA', 'INSONIA', 'OUTRO'],
    description: 'Indicação de uso',
    example: 'DOR',
  })
  @IsEnum(['DOR', 'FEBRE', 'ANSIEDADE', 'AGITACAO', 'NAUSEA', 'INSONIA', 'OUTRO'])
  @IsNotEmpty()
  indication: string;

  @ApiProperty({ description: 'Detalhes da indicação', example: 'dor > 7', required: false })
  @IsString()
  @IsOptional()
  indicationDetails?: string;

  @ApiProperty({ description: 'Intervalo mínimo entre doses', example: '6 horas' })
  @IsString()
  @IsNotEmpty()
  minInterval: string;

  @ApiProperty({ description: 'Máximo de doses diárias', example: 3 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  maxDailyDoses: number;

  @ApiProperty({ description: 'Data de início (YYYY-MM-DD)', example: '2025-11-17' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Data de término (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Instruções de administração', required: false })
  @IsString()
  @IsOptional()
  instructions?: string;
}
