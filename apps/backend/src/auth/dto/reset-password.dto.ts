import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'abc123-def456-ghi789',
    description: 'Token de recuperação de senha recebido por email',
  })
  @IsString()
  @IsNotEmpty({ message: 'Token é obrigatório' })
  token: string;

  @ApiProperty({
    example: 'NovaSenha123!',
    description: 'Nova senha (mínimo 8 caracteres com maiúscula, minúscula, número e caractere especial)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nova senha é obrigatória' })
  @MinLength(8, { message: 'Nova senha deve ter no mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Nova senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial',
  })
  newPassword: string;
}
