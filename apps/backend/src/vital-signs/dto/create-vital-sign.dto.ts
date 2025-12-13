import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsString,
} from 'class-validator';

export class CreateVitalSignDto {
  @ApiProperty({
    description: 'ID do residente',
    example: 'uuid',
  })
  @IsUUID()
  residentId: string;

  @ApiProperty({
    description: 'ID do usuário que registrou (opcional, usa userId do token se não fornecido)',
    example: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: 'Data e hora do registro',
    example: '2025-12-13T10:30:00Z',
  })
  @IsDateString()
  timestamp: Date;

  @ApiProperty({
    description: 'Pressão arterial sistólica (mmHg)',
    example: 120,
    required: false,
    minimum: 50,
    maximum: 250,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(250)
  systolicBloodPressure?: number;

  @ApiProperty({
    description: 'Pressão arterial diastólica (mmHg)',
    example: 80,
    required: false,
    minimum: 30,
    maximum: 150,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(150)
  diastolicBloodPressure?: number;

  @ApiProperty({
    description: 'Temperatura corporal (°C)',
    example: 36.5,
    required: false,
    minimum: 30,
    maximum: 45,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(45)
  temperature?: number;

  @ApiProperty({
    description: 'Frequência cardíaca (bpm)',
    example: 75,
    required: false,
    minimum: 30,
    maximum: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(200)
  heartRate?: number;

  @ApiProperty({
    description: 'Saturação periférica de O₂ (%)',
    example: 98,
    required: false,
    minimum: 50,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(100)
  oxygenSaturation?: number;

  @ApiProperty({
    description: 'Glicemia (mg/dL)',
    example: 95,
    required: false,
    minimum: 20,
    maximum: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(500)
  bloodGlucose?: number;
}
