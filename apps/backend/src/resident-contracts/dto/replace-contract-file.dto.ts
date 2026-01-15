import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * DTO para substituição de arquivo do contrato (nova versão)
 */
export class ReplaceContractFileDto {
  @ApiProperty({
    example: 'Atualização do contrato devido a reajuste de valores conforme cláusula 5.2',
    description: 'Motivo da substituição do arquivo (mínimo 10 caracteres)',
  })
  @IsString()
  @MinLength(10, { message: 'Motivo deve ter no mínimo 10 caracteres' })
  reason: string;
}
