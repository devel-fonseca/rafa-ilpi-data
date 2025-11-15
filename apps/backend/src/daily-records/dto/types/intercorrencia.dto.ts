import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class IntercorrenciaDataDto {
  @ApiProperty({
    description: 'Descrição da intercorrência ocorrida',
    example: 'Queixa de dor leve no joelho',
  })
  @IsString()
  @IsNotEmpty()
  descricao: string;

  @ApiProperty({
    description: 'Ação tomada em resposta à intercorrência',
    example: 'Analgésico administrado (DIP 500mg)',
  })
  @IsString()
  @IsNotEmpty()
  acaoTomada: string;
}
