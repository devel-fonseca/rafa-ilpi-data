import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteMedicationDto {
  @ApiProperty({
    description:
      'Motivo obrigatório da exclusão do medicamento (para conformidade com RDC 502/2021)',
    example: 'Medicamento descontinuado conforme revisão médica',
    minLength: 10,
  })
  @IsString({ message: 'Motivo da exclusão deve ser um texto' })
  @MinLength(10, {
    message: 'Motivo da exclusão deve ter pelo menos 10 caracteres',
  })
  deleteReason: string;
}
