import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CorrectContractDto {
  @ApiProperty({
    description: 'Motivo da correção documental (gera nova versão menor x.y)',
    example: 'Correção de digitalização ilegível na página 2.',
  })
  @IsString()
  @MinLength(10, { message: 'Motivo deve ter no mínimo 10 caracteres' })
  reason: string;
}

