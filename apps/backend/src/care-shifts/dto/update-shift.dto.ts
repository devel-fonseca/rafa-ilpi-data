import { PartialType } from '@nestjs/swagger';
import { CreateShiftDto } from './create-shift.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ShiftStatus } from '@prisma/client';

export class UpdateShiftDto extends PartialType(CreateShiftDto) {
  @ApiProperty({
    description: 'Status do plantão',
    enum: ShiftStatus,
    example: 'CONFIRMED',
    required: false,
  })
  @IsEnum(ShiftStatus, { message: 'status deve ser um valor válido' })
  @IsOptional()
  status?: ShiftStatus;
}
