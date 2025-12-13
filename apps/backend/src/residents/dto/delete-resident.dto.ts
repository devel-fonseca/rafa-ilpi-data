import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * DTO para deleção (soft delete) de residente
 * Requer motivo obrigatório conforme RDC 502/2021 Art. 39
 */
export class DeleteResidentDto {
  /**
   * Motivo da exclusão (obrigatório para auditoria)
   * Mínimo de 10 caracteres para garantir rastreabilidade adequada
   */
  @ApiProperty({
    example: 'Falecimento do residente em 12/12/2025 - Atestado de óbito nº 123456',
    description: 'Motivo obrigatório da exclusão (mínimo 10 caracteres)',
    minLength: 10,
  })
  @IsString({ message: 'changeReason deve ser uma string' })
  @IsNotEmpty({ message: 'changeReason é obrigatório' })
  @MinLength(10, { message: 'changeReason deve ter no mínimo 10 caracteres' })
  changeReason: string;
}
