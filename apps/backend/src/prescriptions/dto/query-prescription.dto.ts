import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsIn } from 'class-validator';

export class QueryPrescriptionDto {
  @ApiProperty({ description: 'Página', example: '1', required: false })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({ description: 'Limite de itens por página', example: '10', required: false })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiProperty({ description: 'ID do residente', required: false })
  @IsOptional()
  @IsString()
  residentId?: string;

  @ApiProperty({
    enum: ['ROTINA', 'ALTERACAO_PONTUAL', 'ANTIBIOTICO', 'ALTO_RISCO', 'CONTROLADO', 'OUTRO'],
    description: 'Tipo de prescrição',
    required: false,
  })
  @IsOptional()
  @IsEnum(['ROTINA', 'ALTERACAO_PONTUAL', 'ANTIBIOTICO', 'ALTO_RISCO', 'CONTROLADO', 'OUTRO'])
  prescriptionType?: string;

  @ApiProperty({ description: 'Ativa (true/false)', required: false })
  @IsOptional()
  @IsString()
  isActive?: string;

  @ApiProperty({
    description: 'Prescrições que vencem em até N dias',
    example: '5',
    required: false,
  })
  @IsOptional()
  @IsString()
  expiringInDays?: string;

  @ApiProperty({ description: 'Possui controlados (true/false)', required: false })
  @IsOptional()
  @IsString()
  hasControlled?: string;

  @ApiProperty({ description: 'Campo de ordenação', required: false })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    enum: ['asc', 'desc'],
    description: 'Ordem de classificação',
    required: false,
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
