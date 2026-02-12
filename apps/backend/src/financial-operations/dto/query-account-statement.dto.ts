import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsDateOnly } from '../../common/validators/date.validators';

export class QueryAccountStatementDto {
  @ApiPropertyOptional({ example: '2026-02-01' })
  @IsOptional()
  @IsDateOnly()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-02-29' })
  @IsOptional()
  @IsDateOnly()
  toDate?: string;
}

