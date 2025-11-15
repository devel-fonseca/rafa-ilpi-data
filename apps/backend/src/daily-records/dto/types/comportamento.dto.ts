import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ComportamentoDataDto {
  @ApiProperty({
    description: 'Descrição do comportamento e humor observado',
    example: 'Calmo, sorridente, interagiu bem com outros residentes',
  })
  @IsString()
  @IsNotEmpty()
  descricao: string;
}
