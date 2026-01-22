import { ApiProperty } from '@nestjs/swagger';
import { IsDateOnly } from '../../common/validators/date.validators';

export class CoverageReportQueryDto {
  @ApiProperty({
    description: 'Data inicial do relatório (YYYY-MM-DD)',
    example: '2026-01-21',
  })
  @IsDateOnly()
  startDate: string;

  @ApiProperty({
    description: 'Data final do relatório (YYYY-MM-DD)',
    example: '2026-02-04',
  })
  @IsDateOnly()
  endDate: string;
}
