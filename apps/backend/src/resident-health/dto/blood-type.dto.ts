import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MinLength,
} from 'class-validator';
import { BloodType } from '@prisma/client';

// ============================================================================
// CREATE
// ============================================================================

export class CreateResidentBloodTypeDto {
  @ApiProperty({
    description: 'ID do residente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  residentId: string;

  @ApiProperty({
    description: 'Tipo sanguíneo',
    enum: BloodType,
    example: 'A_POSITIVO',
  })
  @IsEnum(BloodType)
  bloodType: BloodType;

  @ApiPropertyOptional({
    description: 'Fonte da informação',
    example: 'Exame laboratorial',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Data de confirmação do tipo sanguíneo',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  confirmedAt?: string;
}

// ============================================================================
// UPDATE
// ============================================================================

export class UpdateResidentBloodTypeDto {
  @ApiPropertyOptional({
    description: 'Tipo sanguíneo',
    enum: BloodType,
    example: 'A_POSITIVO',
  })
  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @ApiPropertyOptional({
    description: 'Fonte da informação',
    example: 'Exame laboratorial',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Data de confirmação do tipo sanguíneo',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  confirmedAt?: string;

  @ApiProperty({
    description: 'Motivo da alteração (RDC 502/2021)',
    example: 'Correção após novo exame laboratorial',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, {
    message: 'O motivo da alteração deve ter no mínimo 10 caracteres',
  })
  changeReason: string;
}

// ============================================================================
// RESPONSE
// ============================================================================

export class ResidentBloodTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  residentId: string;

  @ApiProperty({ enum: BloodType })
  bloodType: BloodType;

  @ApiPropertyOptional()
  source: string | null;

  @ApiPropertyOptional()
  confirmedAt: Date | null;

  @ApiProperty()
  versionNumber: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  createdBy: string;

  @ApiPropertyOptional()
  updatedBy: string | null;
}
