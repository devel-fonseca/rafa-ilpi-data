import { PartialType } from '@nestjs/swagger';
import { CreateWeeklyPatternDto } from './create-weekly-pattern.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateWeeklyPatternDto extends PartialType(
  CreateWeeklyPatternDto,
) {
  @ApiProperty({
    description: 'Se o padrão está ativo',
    example: true,
    required: false,
  })
  @IsBoolean({ message: 'isActive deve ser um valor booleano' })
  @IsOptional()
  isActive?: boolean;
}
