import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class VisitaDataDto {
  @ApiProperty({
    description: 'Nome e relação do visitante',
    example: 'João Silva (filho)',
  })
  @IsString()
  @IsNotEmpty()
  visitante: string;

  @ApiProperty({
    required: false,
    description: 'Observações sobre a visita',
    example: 'Visita tranquila, conversaram por 2 horas',
  })
  @IsOptional()
  @IsString()
  observacoes?: string;
}
