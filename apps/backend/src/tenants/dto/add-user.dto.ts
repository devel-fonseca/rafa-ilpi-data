import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsEnum,
  IsBoolean,
  Matches,
} from 'class-validator';

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

export class AddUserToTenantDto {
  @ApiProperty({
    example: 'Maria Santos',
    description: 'Nome do funcionário',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @ApiProperty({
    example: 'maria@email.com',
    description: 'Email do funcionário',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.USER,
    description: 'Papel do usuário no sistema',
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty({
    example: true,
    description: 'Enviar email de convite',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  sendInviteEmail?: boolean = true;

  @ApiProperty({
    example: 'TempPassword123!',
    description: 'Senha temporária (opcional, será gerada se não fornecida)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial',
  })
  temporaryPassword?: string;
}