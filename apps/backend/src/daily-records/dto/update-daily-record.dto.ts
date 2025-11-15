import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDailyRecordDto } from './create-daily-record.dto';

// Omitir residentId do update (não permitir trocar de residente)
export class UpdateDailyRecordDto extends PartialType(
  OmitType(CreateDailyRecordDto, ['residentId'] as const),
) {}
