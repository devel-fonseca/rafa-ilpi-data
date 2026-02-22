import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentSeverity, RdcIndicatorType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { IsDateOnly } from '../../common/validators/date.validators';

export class CreateManualRdcCaseDto {
  @ApiProperty({ description: 'Ano de referência do indicador', example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({ description: 'Mês de referência (1-12)', example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({
    description: 'Tipo do indicador RDC',
    enum: RdcIndicatorType,
  })
  @IsEnum(RdcIndicatorType)
  indicatorType: RdcIndicatorType;

  @ApiProperty({
    description: 'Residente relacionado ao caso',
    format: 'uuid',
  })
  @IsUUID()
  residentId: string;

  @ApiProperty({
    description: 'Data de confirmação do caso (YYYY-MM-DD)',
    example: '2026-02-21',
  })
  @IsDateOnly()
  date: string;

  @ApiProperty({
    description: 'Hora da confirmação do caso (HH:mm)',
    example: '21:30',
  })
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Formato de hora inválido. Use HH:mm.',
  })
  time: string;

  @ApiProperty({
    description: 'Severidade clínica do caso',
    enum: IncidentSeverity,
    example: IncidentSeverity.MODERADA,
  })
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @ApiProperty({
    description: 'Descrição clínica do caso',
    example: 'Diarreia aguda com três episódios em 24 horas.',
  })
  @IsString()
  @MinLength(5)
  description: string;

  @ApiProperty({
    description: 'Ação tomada no momento da confirmação',
    example: 'Notificada enfermagem e iniciado protocolo institucional.',
  })
  @IsString()
  @MinLength(5)
  actionTaken: string;

  @ApiPropertyOptional({
    description: 'Observação complementar para auditoria',
    example: 'Caso confirmado após revisão clínica tardia.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
