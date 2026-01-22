import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class UpdatePatternAssignmentDto {
  @ApiProperty({
    description: 'ID da equipe a ser designada (ou null para remover)',
    example: 'uuid-da-equipe',
    required: false,
    nullable: true,
  })
  @IsUUID('4', { message: 'teamId deve ser um UUID válido' })
  @IsOptional()
  teamId?: string | null;
}
