import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class OutrosDataDto {
  @ApiProperty({
    description: 'Descrição livre do registro',
    example: 'Recebeu medicamento fora do horário habitual por recomendação médica',
  })
  @IsString()
  @IsNotEmpty()
  descricao: string;
}
