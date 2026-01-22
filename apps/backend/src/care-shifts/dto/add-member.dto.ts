import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, MaxLength } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({
    description: 'ID do usuário a ser adicionado',
    example: 'uuid-do-usuario',
  })
  @IsUUID('4', { message: 'userId deve ser um UUID válido' })
  userId: string;

  @ApiProperty({
    description: 'Motivo da adição (opcional)',
    example: 'Reforço devido a alta demanda',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'reason deve ter no máximo 500 caracteres' })
  reason?: string;
}
