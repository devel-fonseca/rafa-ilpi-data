import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SubstituteTeamDto {
  @ApiProperty({
    description: 'ID da equipe original (a ser substituída)',
    example: 'uuid-equipe-original',
  })
  @IsUUID('4', { message: 'originalTeamId deve ser um UUID válido' })
  originalTeamId: string;

  @ApiProperty({
    description: 'ID da nova equipe (substituta)',
    example: 'uuid-equipe-nova',
  })
  @IsUUID('4', { message: 'newTeamId deve ser um UUID válido' })
  newTeamId: string;

  @ApiProperty({
    description: 'Motivo da substituição',
    example: 'Equipe original indisponível devido a treinamento',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'O motivo da substituição é obrigatório' })
  @MaxLength(500, { message: 'reason deve ter no máximo 500 caracteres' })
  reason: string;
}
