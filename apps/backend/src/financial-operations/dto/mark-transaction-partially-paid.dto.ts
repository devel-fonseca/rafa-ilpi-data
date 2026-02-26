import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { IsDateOnly } from '../../common/validators/date.validators';

export class MarkTransactionPartiallyPaidDto {
  @ApiProperty({ example: '2026-02-12' })
  @IsDateOnly()
  paymentDate: string;

  @ApiProperty({ example: '500.00' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Valor parcial deve ser decimal positivo com até 2 casas',
  })
  amount: string;
}
