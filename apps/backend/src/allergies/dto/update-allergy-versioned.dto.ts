import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { AllergySeverity } from '@prisma/client';

export class UpdateAllergyDto {
  @ApiPropertyOptional({
    description: 'Substância alergênica (medicamento, alimento, látex, etc.)',
    example: 'Dipirona',
  })
  @IsOptional()
  @IsString()
  substance?: string;

  @ApiPropertyOptional({
    description: 'Descrição da reação alérgica',
    example: 'Urticária generalizada',
  })
  @IsOptional()
  @IsString()
  reaction?: string;

  @ApiPropertyOptional({
    description: 'Severidade da alergia',
    enum: AllergySeverity,
    example: 'MODERADA',
  })
  @IsOptional()
  @IsEnum(AllergySeverity)
  severity?: AllergySeverity;

  @ApiPropertyOptional({
    description: 'Observações adicionais',
    example: 'Paciente relata episódio em 2020',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Motivo da alteração (obrigatório para auditoria)',
    example: 'Atualização de severidade após nova avaliação médica',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, {
    message: 'O motivo da alteração deve ter no mínimo 10 caracteres',
  })
  changeReason: string;
}
