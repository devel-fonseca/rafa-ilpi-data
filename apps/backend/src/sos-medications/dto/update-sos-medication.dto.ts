import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { CreateSOSMedicationDto } from '../../prescriptions/dto/create-sos-medication.dto';

export class UpdateSOSMedicationDto extends PartialType(
  CreateSOSMedicationDto,
) {
  @ApiProperty({
    description:
      'Motivo obrigatório da alteração do medicamento SOS (para conformidade com RDC 502/2021)',
    example: 'Ajuste de dosagem e intervalo mínimo conforme orientação médica',
    minLength: 10,
  })
  @IsString({ message: 'Motivo da alteração deve ser um texto' })
  @MinLength(10, {
    message: 'Motivo da alteração deve ter pelo menos 10 caracteres',
  })
  changeReason: string;
}
