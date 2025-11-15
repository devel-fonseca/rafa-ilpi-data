import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AtividadesDataDto {
  @ApiProperty({
    description: 'Nome ou tipo da atividade realizada',
    example: 'Música na sala',
  })
  @IsString()
  @IsNotEmpty()
  atividade: string;

  @ApiProperty({
    required: false,
    description: 'Descrição da participação do residente',
    example: 'Participou ativamente, cantou junto',
  })
  @IsOptional()
  @IsString()
  participacao?: string;
}
