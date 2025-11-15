import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';

export class AlimentacaoDataDto {
  @ApiProperty({
    enum: ['Café da Manhã', 'Colação', 'Almoço', 'Lanche', 'Jantar', 'Ceia'],
    description: 'Tipo de refeição',
    example: 'Café da Manhã',
  })
  @IsEnum(['Café da Manhã', 'Colação', 'Almoço', 'Lanche', 'Jantar', 'Ceia'])
  @IsNotEmpty()
  refeicao: string;

  @ApiProperty({
    required: false,
    description: 'Cardápio da refeição',
    example: 'Leite integral, pão com manteiga, banana',
  })
  @IsOptional()
  @IsString()
  cardapio?: string;

  @ApiProperty({
    enum: ['Geral', 'Pastosa', 'Líquida', 'Triturada'],
    description: 'Consistência da alimentação',
    example: 'Geral',
  })
  @IsEnum(['Geral', 'Pastosa', 'Líquida', 'Triturada'])
  @IsNotEmpty()
  consistencia: string;

  @ApiProperty({
    enum: ['100%', '75%', '50%', '<25%', 'Recusou'],
    description: 'Percentual ingerido',
    example: '100%',
  })
  @IsEnum(['100%', '75%', '50%', '<25%', 'Recusou'])
  @IsNotEmpty()
  ingeriu: string;

  @ApiProperty({
    description: 'Indica se foi necessário auxílio para alimentação',
    example: false,
  })
  @IsBoolean()
  @IsNotEmpty()
  auxilioNecessario: boolean;

  @ApiProperty({
    required: false,
    description: 'Hidratação oferecida durante a refeição',
    example: 'Água: 200ml | Suco: 150ml',
  })
  @IsOptional()
  @IsString()
  hidratacao?: string;

  @ApiProperty({
    enum: ['Engasgo', 'Náusea', 'Vômito', 'Recusa', 'Nenhuma'],
    required: false,
    description: 'Intercorrência durante a alimentação',
    example: 'Nenhuma',
  })
  @IsOptional()
  @IsEnum(['Engasgo', 'Náusea', 'Vômito', 'Recusa', 'Nenhuma'])
  intercorrencia?: string;
}
