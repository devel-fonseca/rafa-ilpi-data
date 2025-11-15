import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class MonitoramentoDataDto {
  @ApiProperty({
    required: false,
    description: 'Pressão arterial em mmHg',
    example: '120/80',
  })
  @IsOptional()
  @IsString()
  pressaoArterial?: string;

  @ApiProperty({
    required: false,
    description: 'Temperatura corporal em graus Celsius',
    example: 36.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(45)
  temperatura?: number;

  @ApiProperty({
    required: false,
    description: 'Frequência cardíaca em bpm',
    example: 70,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  frequenciaCardiaca?: number;

  @ApiProperty({
    required: false,
    description: 'Saturação de oxigênio em percentual',
    example: 96,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  saturacaoO2?: number;

  @ApiProperty({
    required: false,
    description: 'Glicemia em mg/dL',
    example: 95,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  glicemia?: number;
}
