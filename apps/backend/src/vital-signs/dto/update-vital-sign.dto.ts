import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { CreateVitalSignDto } from './create-vital-sign.dto';

export class UpdateVitalSignDto extends PartialType(
  OmitType(CreateVitalSignDto, ['residentId'] as const),
) {
  @ApiProperty({
    description: 'Motivo obrigatório da alteração (mínimo 10 caracteres)',
    example: 'Correção de valores aferidos incorretamente',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, {
    message: 'O motivo da alteração deve ter no mínimo 10 caracteres',
  })
  changeReason: string;
}
