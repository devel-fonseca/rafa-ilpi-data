import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class QueryReferenceDataDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() !== 'false';
    return true;
  })
  @IsBoolean()
  activeOnly?: boolean = true;
}

