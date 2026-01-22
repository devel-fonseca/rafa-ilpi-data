import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ListUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por status ativo/inativo',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Filtrar por códigos de cargo (separados por vírgula). Ex: CAREGIVER,NURSE',
    example: 'CAREGIVER,NURSE,NURSING_TECHNICIAN,NURSING_ASSISTANT',
  })
  @IsOptional()
  @IsString()
  positionCodes?: string;
}
