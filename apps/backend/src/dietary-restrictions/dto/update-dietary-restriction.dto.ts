import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { CreateDietaryRestrictionDto } from './create-dietary-restriction.dto';

export class UpdateDietaryRestrictionDto extends PartialType(
  OmitType(CreateDietaryRestrictionDto, ['residentId'] as const),
) {
  @ApiProperty({
    description: 'Motivo obrigatório da alteração (mínimo 10 caracteres)',
    example: 'Atualização de restrição alimentar após nova consulta com nutricionista',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, {
    message: 'O motivo da alteração deve ter no mínimo 10 caracteres',
  })
  changeReason: string;
}
