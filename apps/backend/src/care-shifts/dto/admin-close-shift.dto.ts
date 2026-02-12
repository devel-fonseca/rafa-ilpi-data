import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class AdminCloseShiftDto {
  @ApiProperty({
    description: 'Motivo do encerramento administrativo',
    example: 'Plantão não finalizado pela equipe. Encerrado pelo RT após 2h de atraso.',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(10, { message: 'O motivo deve ter no mínimo 10 caracteres' })
  @MaxLength(1000, { message: 'O motivo deve ter no máximo 1000 caracteres' })
  reason: string;
}
