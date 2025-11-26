import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { CreateDailyRecordDto } from './create-daily-record.dto';

// Omitir residentId do update (não permitir trocar de residente)
export class UpdateDailyRecordDto extends PartialType(
  OmitType(CreateDailyRecordDto, ['residentId'] as const),
) {
  @ApiProperty({
    description:
      'Motivo obrigatório da edição/correção do registro (para conformidade com prontuário eletrônico)',
    example: 'Correção de horário registrado incorretamente',
    minLength: 10,
  })
  @IsString({ message: 'Motivo da edição deve ser um texto' })
  @MinLength(10, {
    message: 'Motivo da edição deve ter pelo menos 10 caracteres',
  })
  editReason: string;
}
