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
import { Transform } from 'class-transformer';
import { IsCPF } from '../../common/validators/cpf.validator';
import { PositionCode } from '@prisma/client';

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
    example: '123.456.789-00',
    description: 'CPF do funcionário (obrigatório)',
    required: true,
  })
  @Transform(({ value }) => {
    // Se for string vazia, retorna undefined para gerar erro de validação
    if (typeof value === 'string' && value.trim() === '') {
      return undefined;
    }
    return value;
  })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @IsString({ message: 'CPF deve ser uma string' })
  @IsCPF()
  cpf: string;

  @ApiProperty({
    example: '(11) 98765-4321',
    description: 'Telefone do funcionário',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'Enfermagem',
    description: 'Departamento do funcionário',
    required: false,
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    enum: PositionCode,
    example: PositionCode.NURSE,
    description: 'Cargo/função do funcionário na ILPI',
    required: false,
  })
  @IsOptional()
  @IsEnum(PositionCode)
  positionCode?: PositionCode;

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