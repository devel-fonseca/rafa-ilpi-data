import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  Max,
  ValidateIf,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { RecordType, ScheduleFrequency } from '@prisma/client';

export class CreateScheduleConfigDto {
  @ApiProperty({
    description: 'ID do residente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  residentId: string;

  @ApiProperty({
    description: 'Tipo de registro diário obrigatório',
    enum: RecordType,
    example: RecordType.PESO,
  })
  @IsEnum(RecordType)
  recordType: RecordType;

  @ApiProperty({
    description: 'Frequência da configuração (DAILY, WEEKLY, MONTHLY)',
    enum: ScheduleFrequency,
    example: ScheduleFrequency.WEEKLY,
  })
  @IsEnum(ScheduleFrequency)
  frequency: ScheduleFrequency;

  @ApiProperty({
    description:
      'Dia da semana (0-6, onde 0=Domingo) - obrigatório se frequency=WEEKLY',
    example: 1,
    required: false,
  })
  @ValidateIf((o) => o.frequency === ScheduleFrequency.WEEKLY)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiProperty({
    description: 'Dia do mês (1-31) - obrigatório se frequency=MONTHLY',
    example: 15,
    required: false,
  })
  @ValidateIf((o) => o.frequency === ScheduleFrequency.MONTHLY)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiProperty({
    description:
      'Horários sugeridos no formato HH:mm (ex: ["08:00", "14:00", "20:00"])',
    example: ['08:00', '14:00'],
    isArray: true,
    type: String,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Pelo menos um horário deve ser informado' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    each: true,
    message: 'Horários devem estar no formato HH:mm (ex: 08:00)',
  })
  suggestedTimes: string[];

  @ApiProperty({
    description: 'Indica se a configuração está ativa',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Observações sobre a configuração',
    example: 'Aferir peso sempre após o café da manhã',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
