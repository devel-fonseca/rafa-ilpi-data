import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteConditionDto {
  @ApiProperty({
    description: 'Motivo da exclusão (obrigatório para auditoria)',
    example: 'Diagnóstico descartado após novos exames',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, {
    message: 'O motivo da exclusão deve ter no mínimo 10 caracteres',
  })
  deleteReason: string;
}
