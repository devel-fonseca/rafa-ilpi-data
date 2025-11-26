import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsUUID } from 'class-validator';

/**
 * DTO para restaurar uma versão anterior de registro diário
 * Requer motivo obrigatório para rastreabilidade (compliance)
 */
export class RestoreVersionDailyRecordDto {
  @ApiProperty({
    description: 'ID da versão do histórico que será restaurada',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  versionId: string;

  @ApiProperty({
    description: 'Motivo obrigatório da restauração (compliance)',
    minLength: 10,
    example: 'Restaurando dados após edição incorreta identificada pela supervisão',
  })
  @IsString()
  @MinLength(10, {
    message: 'Motivo da restauração deve ter pelo menos 10 caracteres',
  })
  restoreReason: string;
}
