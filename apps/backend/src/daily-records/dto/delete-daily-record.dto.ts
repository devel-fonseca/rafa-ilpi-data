import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteDailyRecordDto {
  @ApiProperty({
    description:
      'Motivo obrigatório da exclusão do registro (para conformidade com prontuário eletrônico)',
    example: 'Registro duplicado acidentalmente',
    minLength: 10,
  })
  @IsString({ message: 'Motivo da exclusão deve ser um texto' })
  @MinLength(10, {
    message: 'Motivo da exclusão deve ter pelo menos 10 caracteres',
  })
  deleteReason: string;
}
