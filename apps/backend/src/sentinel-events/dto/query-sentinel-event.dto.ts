import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuerySentinelEventDto {
  @ApiPropertyOptional({
    description: 'Filtrar por status de notificação',
    enum: ['PENDENTE', 'ENVIADO', 'CONFIRMADO'],
  })
  @IsOptional()
  @IsIn(['PENDENTE', 'ENVIADO', 'CONFIRMADO'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Data de início do filtro (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do filtro (YYYY-MM-DD)',
    example: '2026-01-31',
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}
