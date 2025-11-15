import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';

export class EliminacaoDataDto {
  @ApiProperty({
    enum: ['Urina', 'Fezes'],
    description: 'Tipo de eliminação',
    example: 'Urina',
  })
  @IsEnum(['Urina', 'Fezes'])
  @IsNotEmpty()
  tipo: string;

  @ApiProperty({
    required: false,
    description: 'Frequência da eliminação',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  frequencia?: number;

  @ApiProperty({
    required: false,
    description: 'Consistência observada',
    example: 'Pastosa',
  })
  @IsOptional()
  @IsString()
  consistencia?: string;

  @ApiProperty({
    required: false,
    description: 'Cor observada',
    example: 'Amarela',
  })
  @IsOptional()
  @IsString()
  cor?: string;

  @ApiProperty({
    required: false,
    description: 'Volume observado',
    example: 'Normal',
  })
  @IsOptional()
  @IsString()
  volume?: string;
}
