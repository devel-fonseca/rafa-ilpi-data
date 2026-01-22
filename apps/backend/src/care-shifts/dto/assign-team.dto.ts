import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTeamDto {
  @ApiProperty({
    description: 'ID da equipe a ser designada',
    example: 'uuid-da-equipe',
  })
  @IsUUID('4', { message: 'teamId deve ser um UUID válido' })
  teamId: string;
}
