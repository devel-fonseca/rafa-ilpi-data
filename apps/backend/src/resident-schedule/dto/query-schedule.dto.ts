import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class QueryDailyTasksDto {
  @ApiProperty({
    description:
      'Data para buscar tarefas no formato ISO 8601 (YYYY-MM-DD). Se não informado, usa data atual.',
    example: '2024-06-15',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
