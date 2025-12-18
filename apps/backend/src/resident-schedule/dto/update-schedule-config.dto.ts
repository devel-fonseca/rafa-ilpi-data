import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateScheduleConfigDto } from './create-schedule-config.dto';

export class UpdateScheduleConfigDto extends PartialType(
  CreateScheduleConfigDto,
) {
  @ApiProperty({
    description: 'ID do residente - não pode ser alterado',
    required: false,
    readOnly: true,
  })
  residentId?: string;
}
