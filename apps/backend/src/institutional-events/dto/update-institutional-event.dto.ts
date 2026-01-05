import { PartialType } from '@nestjs/mapped-types';
import { CreateInstitutionalEventDto } from './create-institutional-event.dto';
import { IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateInstitutionalEventDto extends PartialType(
  CreateInstitutionalEventDto,
) {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completedAt?: Date;
}
