import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * DTO para exclusão (soft delete) de registro de vacinação
 * Conformidade: RDC 502/2021 - Requer motivo obrigatório para exclusões
 */
export class DeleteVaccinationDto {
  @ApiProperty({
    description:
      'Motivo obrigatório da exclusão do registro de vacinação (para conformidade com RDC 502/2021)',
    example: 'Registro duplicado identificado após auditoria do sistema',
    minLength: 10,
  })
  @IsString({ message: 'Motivo da exclusão deve ser um texto' })
  @MinLength(10, {
    message: 'Motivo da exclusão deve ter pelo menos 10 caracteres',
  })
  deleteReason: string;
}
