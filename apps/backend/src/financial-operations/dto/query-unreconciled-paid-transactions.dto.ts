import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { IsDateOnly } from '../../common/validators/date.validators';

export class QueryUnreconciledPaidTransactionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @ApiPropertyOptional({ example: '2026-02-01' })
  @IsOptional()
  @IsDateOnly()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-02-12' })
  @IsOptional()
  @IsDateOnly()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
