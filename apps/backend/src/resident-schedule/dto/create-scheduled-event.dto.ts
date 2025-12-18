import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsDateString,
  IsOptional,
  IsObject,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ScheduledEventType } from '@prisma/client';

export class VaccineDataDto {
  @ApiProperty({
    description: 'Nome da vacina',
    example: 'Influenza (Gripe)',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Dose da vacina',
    example: 'Dose Única Anual',
  })
  @IsString()
  dose: string;

  @ApiProperty({
    description: 'Fabricante da vacina',
    example: 'Instituto Butantan',
    required: false,
  })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiProperty({
    description: 'Lote da vacina',
    example: 'L202312345',
    required: false,
  })
  @IsOptional()
  @IsString()
  batchNumber?: string;
}

export class CreateScheduledEventDto {
  @ApiProperty({
    description: 'ID do residente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  residentId: string;

  @ApiProperty({
    description: 'Tipo de evento agendado',
    enum: ScheduledEventType,
    example: ScheduledEventType.VACCINATION,
  })
  @IsEnum(ScheduledEventType)
  eventType: ScheduledEventType;

  @ApiProperty({
    description: 'Data do agendamento no formato ISO 8601 (YYYY-MM-DD)',
    example: '2024-06-15',
  })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({
    description: 'Horário do agendamento no formato HH:mm',
    example: '10:30',
  })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Horário deve estar no formato HH:mm (ex: 10:30)',
  })
  scheduledTime: string;

  @ApiProperty({
    description: 'Título do evento',
    example: 'Vacinação contra Influenza 2024',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Descrição detalhada do evento',
    example: 'Campanha anual de vacinação contra gripe',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description:
      'Dados da vacina (DEPRECATED - registrar posteriormente no módulo de Vacinação)',
    type: VaccineDataDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  vaccineData?: VaccineDataDto;

  @ApiProperty({
    description: 'Observações sobre o agendamento',
    example: 'Residente alérgico a ovo - usar vacina sem ovo',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
