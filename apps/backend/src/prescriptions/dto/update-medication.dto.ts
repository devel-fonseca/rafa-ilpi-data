import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { CreateMedicationDto } from './create-medication.dto';

export class UpdateMedicationDto extends PartialType(CreateMedicationDto) {
  @ApiProperty({
    description:
      'Motivo obrigatório da alteração do medicamento (para conformidade com RDC 502/2021)',
    example: 'Ajuste de dosagem conforme orientação médica',
    minLength: 10,
  })
  @IsString({ message: 'Motivo da alteração deve ser um texto' })
  @MinLength(10, {
    message: 'Motivo da alteração deve ter pelo menos 10 caracteres',
  })
  changeReason: string;
}
