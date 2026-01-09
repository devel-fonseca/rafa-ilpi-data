import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { IsCPF } from '../../common/validators/cpf.validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'Maria Silva Santos',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Nome deve ser um texto' })
  name?: string;

  @ApiProperty({
    description: 'Email do usuário (único por tenant)',
    example: 'maria.silva@example.com',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Email deve ser um texto' })
  email?: string;

  @ApiProperty({
    description: 'Nova senha do usuário',
    example: 'NovaSenha@123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Senha deve ser um texto' })
  password?: string;

  @ApiProperty({
    description: 'Perfil do usuário (admin | user | viewer)',
    example: 'user',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Perfil deve ser um texto' })
  role?: string;

  @ApiProperty({
    description: 'Status de ativação do usuário',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive deve ser verdadeiro ou falso' })
  isActive?: boolean;

  @ApiProperty({
    description: 'CPF do usuário (identificação única nacional)',
    example: '123.456.789-00',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'CPF deve ser um texto' })
  @IsCPF({ message: 'CPF inválido. Formato esperado: xxx.xxx.xxx-xx ou apenas 11 dígitos numéricos' })
  cpf?: string;

  @ApiProperty({
    description:
      'Motivo obrigatório da alteração do usuário (para conformidade com LGPD)',
    example: 'Atualização de perfil solicitada pelo gestor',
    minLength: 10,
  })
  @IsString({ message: 'Motivo da alteração deve ser um texto' })
  @MinLength(10, {
    message: 'Motivo da alteração deve ter pelo menos 10 caracteres',
  })
  changeReason: string;
}
