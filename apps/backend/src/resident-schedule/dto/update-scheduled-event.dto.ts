import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateScheduledEventDto } from './create-scheduled-event.dto';
import { ScheduledEventStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateScheduledEventDto extends PartialType(
  CreateScheduledEventDto,
) {
  @ApiProperty({
    description: 'ID do residente - não pode ser alterado',
    required: false,
    readOnly: true,
  })
  residentId?: string;

  @ApiProperty({
    description: 'Status do agendamento',
    enum: ScheduledEventStatus,
    example: ScheduledEventStatus.COMPLETED,
    required: false,
  })
  @IsOptional()
  @IsEnum(ScheduledEventStatus)
  status?: ScheduledEventStatus;

  @ApiProperty({
    description:
      'ID do registro diário criado ao concluir o evento (usado para vincular um agendamento a um registro)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  completedRecordId?: string;
}
