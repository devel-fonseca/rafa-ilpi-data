import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteDietaryRestrictionDto {
  @ApiProperty({
    description: 'Motivo obrigatório da exclusão (mínimo 10 caracteres)',
    example: 'Restrição alimentar não é mais necessária após reavaliação nutricional',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, {
    message: 'O motivo da exclusão deve ter no mínimo 10 caracteres',
  })
  deleteReason: string;
}
