import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteClinicalProfileDto {
  @ApiProperty({
    description:
      'Motivo obrigatório da remoção do perfil clínico (mínimo 10 caracteres)',
    example: 'Residente transferido para outra instituição',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, {
    message: 'O motivo da remoção deve ter no mínimo 10 caracteres',
  })
  deleteReason: string;
}
