import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { RestrictionType } from '@prisma/client';

export class CreateDietaryRestrictionDto {
  @ApiProperty({
    description: 'ID do residente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  residentId: string;

  @ApiProperty({
    description: 'Tipo de restrição alimentar',
    enum: RestrictionType,
    example: 'DIABETES',
  })
  @IsEnum(RestrictionType)
  restrictionType: RestrictionType;

  @ApiProperty({
    description: 'Descrição detalhada da restrição',
    example: 'Dieta hipossódica, sem açúcar',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Observações do nutricionista',
    example: 'Orientado sobre hidratação adequada',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Indicação de contraindicações assistenciais relacionadas',
    example: 'Evitar alimentos ultraprocessados e embutidos',
  })
  @IsOptional()
  @IsString()
  contraindications?: string;
}
