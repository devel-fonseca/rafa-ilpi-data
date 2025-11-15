import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class HidratacaoDataDto {
  @ApiProperty({
    description: 'Volume em mililitros',
    example: 200,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  volumeMl: number;

  @ApiProperty({
    required: false,
    description: 'Tipo de líquido oferecido',
    example: 'Água',
  })
  @IsOptional()
  @IsString()
  tipo?: string;
}
