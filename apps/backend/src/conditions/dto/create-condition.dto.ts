import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';

export class CreateConditionDto {
  @ApiProperty({
    description: 'ID do residente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  residentId: string;

  @ApiProperty({
    description: 'Nome da condição ou diagnóstico',
    example: 'Diabetes Mellitus Tipo 2',
  })
  @IsString()
  condition: string;

  @ApiPropertyOptional({
    description: 'Código CID-10 (opcional)',
    example: 'E11',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  icdCode?: string;

  @ApiPropertyOptional({
    description: 'Observações clínicas',
    example: 'Controlado com Metformina 850mg 2x/dia',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
