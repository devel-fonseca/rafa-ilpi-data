import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { IsDateOnly } from '../../common/validators/date.validators';

export class CreateReconciliationDto {
  @ApiProperty()
  @IsUUID()
  bankAccountId!: string;

  @ApiProperty({ example: '2026-02-12' })
  @IsDateOnly()
  reconciliationDate!: string;

  @ApiProperty({ example: '2026-02-01' })
  @IsDateOnly()
  startDate!: string;

  @ApiProperty({ example: '2026-02-12' })
  @IsDateOnly()
  endDate!: string;

  @ApiProperty({ example: '1000.00' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Saldo inicial deve ser decimal positivo com até 2 casas',
  })
  openingBalance!: string;

  @ApiProperty({ example: '1200.00' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Saldo final informado deve ser decimal positivo com até 2 casas',
  })
  closingBalance!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}
