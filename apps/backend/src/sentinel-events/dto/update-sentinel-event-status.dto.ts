import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSentinelEventStatusDto {
  @ApiProperty({
    description: 'Novo status de notificação',
    enum: ['ENVIADO', 'CONFIRMADO'],
    example: 'ENVIADO',
  })
  @IsIn(['ENVIADO', 'CONFIRMADO'])
  status: 'ENVIADO' | 'CONFIRMADO';

  @ApiPropertyOptional({
    description: 'Protocolo de notificação à vigilância',
    example: 'PROTO-2026-001',
  })
  @IsOptional()
  @IsString()
  protocolo?: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre a notificação',
  })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'ID do responsável pelo envio',
  })
  @IsOptional()
  @IsUUID()
  responsavelEnvio?: string;
}
