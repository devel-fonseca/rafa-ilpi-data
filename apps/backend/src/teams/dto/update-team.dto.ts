import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateTeamDto } from './create-team.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTeamDto extends PartialType(CreateTeamDto) {
  @ApiPropertyOptional({
    description: 'Define se a equipe está ativa',
    example: true,
  })
  @IsBoolean({ message: 'isActive deve ser um valor booleano' })
  @IsOptional()
  isActive?: boolean;
}
