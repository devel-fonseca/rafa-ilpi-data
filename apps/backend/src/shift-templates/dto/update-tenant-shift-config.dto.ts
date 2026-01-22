import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, Matches, IsInt, Min, Max } from 'class-validator';

export class UpdateTenantShiftConfigDto {
  @ApiProperty({
    description: 'Se este turno está habilitado para o tenant',
    example: true,
    required: false,
  })
  @IsBoolean({ message: 'isEnabled deve ser um valor booleano' })
  @IsOptional()
  isEnabled?: boolean;

  @ApiProperty({
    description: 'Nome customizado para o turno (opcional)',
    example: 'Plantão Manhã',
    required: false,
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'customName deve ter no máximo 50 caracteres' })
  customName?: string;

  @ApiProperty({
    description: 'Horário de início customizado (formato HH:mm). Se não fornecido, usa padrão do ShiftTemplate',
    example: '08:00',
    required: false,
    pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'customStartTime deve estar no formato HH:mm (ex: 08:00)',
  })
  customStartTime?: string;

  @ApiProperty({
    description: 'Horário de fim customizado (formato HH:mm). Se não fornecido, usa padrão do ShiftTemplate',
    example: '16:00',
    required: false,
    pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'customEndTime deve estar no formato HH:mm (ex: 16:00)',
  })
  customEndTime?: string;

  @ApiProperty({
    description: 'Duração customizada em horas (8 ou 12). Se não fornecido, usa padrão do ShiftTemplate',
    example: 8,
    required: false,
    minimum: 1,
    maximum: 24,
  })
  @IsInt({ message: 'customDuration deve ser um número inteiro' })
  @IsOptional()
  @Min(1, { message: 'customDuration deve ser no mínimo 1 hora' })
  @Max(24, { message: 'customDuration deve ser no máximo 24 horas' })
  customDuration?: number;
}
