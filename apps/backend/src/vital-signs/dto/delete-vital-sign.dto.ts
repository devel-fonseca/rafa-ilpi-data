import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteVitalSignDto {
  @ApiProperty({
    description:
      'Motivo obrigatório da remoção do sinal vital (mínimo 10 caracteres)',
    example: 'Registro duplicado removido após conferência',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, {
    message: 'O motivo da remoção deve ter no mínimo 10 caracteres',
  })
  deleteReason: string;
}
