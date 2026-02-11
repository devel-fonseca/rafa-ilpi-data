import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO para atualização de notas do plantão
 *
 * Permite que o líder/suplente registre observações durante o turno.
 * O campo notes pode ser atualizado múltiplas vezes durante o plantão.
 */
export class UpdateShiftNotesDto {
  @ApiPropertyOptional({
    description: 'Notas/observações do plantão',
    example:
      '09:15 - Sr. João apresentou febre leve (37.5°)\n10:30 - Medicação administrada conforme prescrição',
    maxLength: 10000,
  })
  @IsString({ message: 'As notas devem ser uma string' })
  @IsOptional()
  @MaxLength(10000, { message: 'As notas podem ter no máximo 10.000 caracteres' })
  notes?: string;
}
