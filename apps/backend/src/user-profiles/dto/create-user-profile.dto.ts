import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsEnum,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { PositionCode, RegistrationType } from '@prisma/client';
import { UserPreferences } from '../types/user-preferences.type';

export class CreateUserProfileDto {
  @ApiProperty({
    description: 'URL ou path da foto de perfil do usuário',
    example: 'https://example.com/photos/user123.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profilePhoto?: string;

  @ApiProperty({
    description: 'Telefone do usuário',
    example: '(11) 98765-4321',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    description: 'Departamento do usuário',
    example: 'Enfermagem',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiProperty({
    description: 'Data de nascimento do usuário',
    example: '1990-05-15',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({
    description: 'Notas ou observações sobre o usuário',
    example: 'Responsável pelo turno da manhã',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  // ────────────────────────────────────────────────────────────────
  // Campos de Permissões ILPI
  // ────────────────────────────────────────────────────────────────

  @ApiProperty({
    description: 'Cargo padronizado ILPI do usuário',
    enum: PositionCode,
    example: PositionCode.NURSE,
    required: false,
  })
  @IsOptional()
  @IsEnum(PositionCode)
  positionCode?: PositionCode;

  @ApiProperty({
    description: 'Tipo de registro profissional (COREN, CRM, etc)',
    enum: RegistrationType,
    example: RegistrationType.COREN,
    required: false,
  })
  @IsOptional()
  @IsEnum(RegistrationType)
  registrationType?: RegistrationType;

  @ApiProperty({
    description: 'Número do registro no conselho profissional',
    example: '123456-SP',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNumber?: string;

  @ApiProperty({
    description: 'UF do registro profissional',
    example: 'SP',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  registrationState?: string;

  @ApiProperty({
    description: 'Se o usuário é Responsável Técnico da ILPI',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isTechnicalManager?: boolean;

  @ApiProperty({
    description: 'Se o usuário é Coordenador de Enfermagem',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isNursingCoordinator?: boolean;

  // ────────────────────────────────────────────────────────────────
  // Preferências do Usuário
  // ────────────────────────────────────────────────────────────────

  @ApiProperty({
    description: 'Preferências do usuário (tema, sidebar, notificações, etc)',
    example: {
      theme: 'light',
      sidebarCollapsed: false,
      locale: 'pt-BR',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  preferences?: UserPreferences;
}
