import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SubstituteMemberDto {
  @ApiProperty({
    description: 'ID do membro original (a ser substituído)',
    example: 'uuid-usuario-original',
  })
  @IsUUID('4', { message: 'originalUserId deve ser um UUID válido' })
  originalUserId: string;

  @ApiProperty({
    description: 'ID do novo membro (substituto)',
    example: 'uuid-usuario-novo',
  })
  @IsUUID('4', { message: 'newUserId deve ser um UUID válido' })
  newUserId: string;

  @ApiProperty({
    description: 'Motivo da substituição',
    example: 'Cuidador original de férias',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'O motivo da substituição é obrigatório' })
  @MaxLength(500, { message: 'reason deve ter no máximo 500 caracteres' })
  reason: string;
}
