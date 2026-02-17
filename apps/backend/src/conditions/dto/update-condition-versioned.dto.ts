import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class UpdateConditionDto {
  @ApiPropertyOptional({
    description: 'Nome da condição ou diagnóstico',
    example: 'Diabetes Mellitus Tipo 2',
  })
  @IsOptional()
  @IsString()
  condition?: string;

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

  @ApiPropertyOptional({
    description: 'Indicação de contraindicações assistenciais relacionadas',
    example: 'Evitar uso de corticoide sem avaliação médica prévia',
  })
  @IsOptional()
  @IsString()
  contraindications?: string;

  @ApiProperty({
    description: 'Motivo da alteração (obrigatório para auditoria)',
    example: 'Atualização do CID após reavaliação médica',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, {
    message: 'O motivo da alteração deve ter no mínimo 10 caracteres',
  })
  changeReason: string;
}
