import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsEmail,
  MaxLength,
  MinLength,
  Matches,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

enum Gender {
  MASCULINO = 'MASCULINO',
  FEMININO = 'FEMININO',
  OUTRO = 'OUTRO',
  NAO_INFORMADO = 'NAO_INFORMADO',
}

enum CivilStatus {
  SOLTEIRO = 'SOLTEIRO',
  CASADO = 'CASADO',
  DIVORCIADO = 'DIVORCIADO',
  VIUVO = 'VIUVO',
  UNIAO_ESTAVEL = 'UNIAO_ESTAVEL',
}

export class CreateResidentDto {
  @ApiProperty({ description: 'Nome completo do residente' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  nome: string;

  @ApiPropertyOptional({ description: 'CPF do residente (formato: 000.000.000-00)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF deve estar no formato 000.000.000-00',
  })
  cpf?: string;

  @ApiPropertyOptional({ description: 'RG do residente' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  rg?: string;

  @ApiPropertyOptional({ description: 'Órgão expedidor do RG' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  orgaoExpedidor?: string;

  @ApiPropertyOptional({ description: 'Cartão Nacional de Saúde' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  cns?: string;

  @ApiProperty({ description: 'Gênero', enum: Gender })
  @IsEnum(Gender)
  genero: Gender;

  @ApiProperty({ description: 'Data de nascimento (ISO 8601)' })
  @IsDateString()
  dataNascimento: string;

  @ApiPropertyOptional({ description: 'Estado civil', enum: CivilStatus })
  @IsOptional()
  @IsEnum(CivilStatus)
  estadoCivil?: CivilStatus;

  @ApiPropertyOptional({ description: 'Naturalidade' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  naturalidade?: string;

  @ApiPropertyOptional({ description: 'Nacionalidade' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nacionalidade?: string = 'Brasileira';

  @ApiPropertyOptional({ description: 'Nome da mãe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nomeMae?: string;

  @ApiPropertyOptional({ description: 'Nome do pai' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nomePai?: string;

  // Endereço
  @ApiPropertyOptional({ description: 'Endereço atual' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  enderecoAtual?: string;

  @ApiPropertyOptional({ description: 'Bairro' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bairroAtual?: string;

  @ApiPropertyOptional({ description: 'Cidade' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cidadeAtual?: string;

  @ApiPropertyOptional({ description: 'Estado (UF)' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  estadoAtual?: string;

  @ApiPropertyOptional({ description: 'CEP' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-\d{3}$/, {
    message: 'CEP deve estar no formato 00000-000',
  })
  cepAtual?: string;

  // Contato de emergência / Responsável
  @ApiPropertyOptional({ description: 'Nome do responsável' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nomeResponsavel?: string;

  @ApiPropertyOptional({ description: 'CPF do responsável' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF deve estar no formato 000.000.000-00',
  })
  cpfResponsavel?: string;

  @ApiPropertyOptional({ description: 'RG do responsável' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  rgResponsavel?: string;

  @ApiPropertyOptional({ description: 'Parentesco do responsável' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  parentescoResponsavel?: string;

  @ApiPropertyOptional({ description: 'Telefone do responsável' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefoneResponsavel?: string;

  @ApiPropertyOptional({ description: 'Email do responsável' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  emailResponsavel?: string;

  @ApiPropertyOptional({ description: 'Endereço do responsável' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  enderecoResponsavel?: string;

  // Informações de admissão
  @ApiPropertyOptional({ description: 'Data de admissão (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dataAdmissao?: string;

  @ApiPropertyOptional({ description: 'Tipo de admissão (Voluntária, Judicial, Emergencial)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoAdmissao?: string;

  @ApiPropertyOptional({ description: 'Motivo da admissão' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoAdmissao?: string;

  // Informações de saúde básicas
  @ApiPropertyOptional({ description: 'Tipo sanguíneo' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tipoSanguineo?: string;

  @ApiPropertyOptional({ description: 'Alergias conhecidas' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  alergias?: string;

  @ApiPropertyOptional({ description: 'Medicamentos em uso' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  medicamentos?: string;

  @ApiPropertyOptional({ description: 'Condições médicas/Comorbidades' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comorbidades?: string;

  @ApiPropertyOptional({ description: 'Observações gerais' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}