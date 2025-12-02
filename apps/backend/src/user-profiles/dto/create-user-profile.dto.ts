import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

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
    description: 'Cargo do usuário na instituição',
    example: 'Enfermeiro(a)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

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
}
