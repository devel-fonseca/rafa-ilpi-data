import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, MaxLength } from 'class-validator';

export class AddTeamMemberDto {
  @ApiProperty({
    description: 'ID do usuário a ser adicionado à equipe',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'userId deve ser um UUID válido' })
  userId: string;

  @ApiPropertyOptional({
    description: 'Papel do membro na equipe (ex: "Líder", "Substituto")',
    example: 'Líder',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'O papel deve ter no máximo 50 caracteres' })
  role?: string;
}
