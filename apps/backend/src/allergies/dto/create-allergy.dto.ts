import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { AllergySeverity } from '@prisma/client';

export class CreateAllergyDto {
  @ApiProperty({
    description: 'ID do residente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  residentId: string;

  @ApiProperty({
    description: 'Substância alergênica (medicamento, alimento, látex, etc.)',
    example: 'Dipirona',
  })
  @IsString()
  substance: string;

  @ApiPropertyOptional({
    description: 'Descrição da reação alérgica',
    example: 'Urticária generalizada',
  })
  @IsOptional()
  @IsString()
  reaction?: string;

  @ApiPropertyOptional({
    description: 'Severidade da alergia',
    enum: AllergySeverity,
    example: 'MODERADA',
  })
  @IsOptional()
  @IsEnum(AllergySeverity)
  severity?: AllergySeverity;

  @ApiPropertyOptional({
    description: 'Observações adicionais',
    example: 'Paciente relata episódio em 2020',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
