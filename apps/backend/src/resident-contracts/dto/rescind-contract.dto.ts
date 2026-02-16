import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class RescindContractDto {
  @ApiProperty({
    description: 'Motivo da rescisão',
    example: 'Rescisão por solicitação da família.',
  })
  @IsString()
  @MinLength(10, { message: 'Motivo deve ter no mínimo 10 caracteres' })
  reason: string;

  @ApiProperty({
    required: false,
    description: 'Data efetiva da rescisão (YYYY-MM-DD). Padrão: data atual',
    example: '2026-02-15',
  })
  @IsOptional()
  @IsDateString()
  rescindedAt?: string;
}

