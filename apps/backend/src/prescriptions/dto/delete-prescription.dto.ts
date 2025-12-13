import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * DTO para exclusão de prescrição com auditoria
 * Conforme RDC 502/2021 Art. 39 (ANVISA) - toda exclusão deve ser justificada
 */
export class DeletePrescriptionDto {
  @ApiProperty({
    description: 'Motivo obrigatório da exclusão (mínimo 10 caracteres)',
    example: 'Prescrição duplicada acidentalmente no sistema',
    required: true,
    minLength: 10,
  })
  @IsString()
  @MinLength(10, {
    message: 'deleteReason deve ter no mínimo 10 caracteres',
  })
  deleteReason: string;
}
