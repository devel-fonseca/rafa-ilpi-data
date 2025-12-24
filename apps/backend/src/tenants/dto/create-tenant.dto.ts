import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  Matches,
  MaxLength,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { IsCPF } from '../../common/validators/cpf.validator';

export class CreateTenantDto {
  // Dados da ILPI
  @ApiProperty({ example: 'ILPI Boa Vida', description: 'Nome da ILPI' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: '12.345.678/0001-90',
    description: 'CNPJ da ILPI',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message: 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX',
  })
  cnpj?: string;

  @ApiProperty({
    example: 'contato@ilpiboavida.com.br',
    description: 'Email principal da ILPI',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '(11) 98765-4321',
    description: 'Telefone principal',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  // Endereço
  @ApiProperty({
    example: 'Rua das Flores',
    description: 'Logradouro (Rua, Avenida, etc)',
    required: false,
  })
  @IsOptional()
  @IsString()
  addressStreet?: string;

  @ApiProperty({ example: '123', description: 'Número', required: false })
  @IsOptional()
  @IsString()
  addressNumber?: string;

  @ApiProperty({
    example: 'Apto 45',
    description: 'Complemento',
    required: false,
  })
  @IsOptional()
  @IsString()
  addressComplement?: string;

  @ApiProperty({
    example: 'Centro',
    description: 'Bairro',
    required: false,
  })
  @IsOptional()
  @IsString()
  addressDistrict?: string;

  @ApiProperty({
    example: 'São Paulo',
    description: 'Cidade',
    required: false,
  })
  @IsOptional()
  @IsString()
  addressCity?: string;

  @ApiProperty({ example: 'SP', description: 'Estado', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  addressState?: string;

  @ApiProperty({
    example: '01234-567',
    description: 'CEP',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-\d{3}$/, {
    message: 'CEP deve estar no formato XXXXX-XXX',
  })
  addressZipCode?: string;

  // Dados do Admin (primeiro usuário)
  @ApiProperty({
    example: 'Dr. João Silva',
    description: 'Nome do administrador',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  adminName: string;

  @ApiProperty({
    example: '123.456.789-00',
    description: 'CPF do administrador',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF deve estar no formato XXX.XXX.XXX-XX',
  })
  @IsCPF({ message: 'CPF inválido' })
  adminCpf: string;

  @ApiProperty({
    example: 'joao@ilpiboavida.com.br',
    description: 'Email do administrador',
  })
  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @ApiProperty({
    example: 'SenhaSegura123!',
    description: 'Senha do administrador',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial',
  })
  adminPassword: string;

  // Plano escolhido
  @ApiProperty({
    example: 'uuid-do-plano',
    description: 'ID do plano escolhido',
  })
  @IsUUID()
  @IsNotEmpty()
  planId: string;

  // Token de aceite do contrato
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de aceite do contrato gerado no passo anterior',
  })
  @IsString()
  @IsNotEmpty()
  acceptanceToken: string;

  // Declarações LGPD (Step 4)
  @ApiProperty({
    example: true,
    description: 'Declaração de que a ILPI é Controladora de Dados',
  })
  @IsBoolean()
  @IsNotEmpty()
  lgpdIsDataController: boolean;

  @ApiProperty({
    example: true,
    description: 'Declaração de que possui base legal para tratamento de dados',
  })
  @IsBoolean()
  @IsNotEmpty()
  lgpdHasLegalBasis: boolean;

  @ApiProperty({
    example: true,
    description: 'Reconhecimento das responsabilidades LGPD',
  })
  @IsBoolean()
  @IsNotEmpty()
  lgpdAcknowledgesResponsibility: boolean;

  // Aceite da Política de Privacidade (Step 5)
  @ApiProperty({
    example: true,
    description: 'Aceite da Política de Privacidade',
  })
  @IsBoolean()
  @IsNotEmpty()
  privacyPolicyAccepted: boolean;
}