import { ApiProperty } from '@nestjs/swagger';
import { IsDateOnly } from '../../common/validators/date.validators';

export class MarkTransactionPaidDto {
  @ApiProperty({ example: '2026-02-12' })
  @IsDateOnly()
  paymentDate: string;
}
