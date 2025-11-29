import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
  IsUUID,
  ArrayMinSize,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Helper para transformar string vazia em undefined
const EmptyToUndefined = () => Transform(({ value }) => value === '' ? undefined : value);

// DTOs aninhados para arrays complexos
class EmergencyContactDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '(11) 98765-4321' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Filha' })
  @IsString()
  @IsNotEmpty()
  relationship: string;
}

class MedicalReportDto {
  @ApiProperty({ example: 'https://...' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ example: '2025-01-15T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  date: string;
}

class HealthPlanDto {
  @ApiProperty({ example: 'Unimed' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '123456789', required: false })
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @ApiProperty({ example: 'https://...', required: false })
  @IsOptional()
  @IsString()
  cardUrl?: string;
}

/**
 * DTO para criação de residente
 * Com decorators de validação para ValidationPipe
 */
export class CreateResidentDto {
  @ApiProperty({ example: 'uuid-tenant' })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  // 0. Status
  @ApiProperty({ example: 'Ativo', enum: ['Ativo', 'Inativo', 'Falecido'] })
  @IsEnum(['Ativo', 'Inativo', 'Falecido'])
  @IsOptional()
  status?: 'Ativo' | 'Inativo' | 'Falecido' = 'Ativo';

  // 1. Dados Pessoais
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'João Silva', required: false })
  @IsOptional()
  @IsString()
  socialName?: string;

  @ApiProperty({ example: '123.456.789-00' })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ example: '12.345.678-9', required: false })
  @IsOptional()
  @IsString()
  rg?: string;

  @ApiProperty({ example: 'SSP/SP', required: false })
  @IsOptional()
  @IsString()
  rgIssuer?: string;

  @ApiProperty({ example: 'Ensino Médio', required: false })
  @IsOptional()
  @IsString()
  education?: string;

  @ApiProperty({ example: 'Aposentado', required: false })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiProperty({ example: '123456789012345', required: false })
  @IsOptional()
  @IsString()
  cns?: string;

  @ApiProperty({ example: 'MASCULINO', enum: ['MASCULINO', 'FEMININO', 'OUTRO', 'NAO_INFORMADO'] })
  @IsEnum(['MASCULINO', 'FEMININO', 'OUTRO', 'NAO_INFORMADO'])
  @IsNotEmpty()
  gender: 'MASCULINO' | 'FEMININO' | 'OUTRO' | 'NAO_INFORMADO';

  @ApiProperty({ example: 'SOLTEIRO', enum: ['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL'], required: false })
  @EmptyToUndefined()
  @IsOptional()
  @IsEnum(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL'])
  civilStatus?: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_ESTAVEL';

  @ApiProperty({ example: 'Católica', required: false })
  @IsOptional()
  @IsString()
  religion?: string;

  @ApiProperty({ example: '1950-01-15T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  birthDate: string;

  @ApiProperty({ example: 'Brasileira' })
  @IsString()
  @IsOptional()
  nationality?: string = 'Brasileira';

  @ApiProperty({ example: 'São Paulo', required: false })
  @IsOptional()
  @IsString()
  birthCity?: string;

  @ApiProperty({ example: 'SP', required: false })
  @IsOptional()
  @IsString()
  birthState?: string;

  @ApiProperty({ example: 'Maria da Silva', required: false })
  @IsOptional()
  @IsString()
  motherName?: string;

  @ApiProperty({ example: 'José da Silva', required: false })
  @IsOptional()
  @IsString()
  fatherName?: string;

  @ApiProperty({ example: 'https://s3.rafalabs.com.br/rafa-ilpi-files/photos/123.jpg', required: false })
  @IsOptional()
  @IsString()
  fotoUrl?: string;

  // 2. Endereços
  @ApiProperty({ example: '01234-567', required: false })
  @IsOptional()
  @IsString()
  currentCep?: string;

  @ApiProperty({ example: 'SP', required: false })
  @IsOptional()
  @IsString()
  currentState?: string;

  @ApiProperty({ example: 'São Paulo', required: false })
  @IsOptional()
  @IsString()
  currentCity?: string;

  @ApiProperty({ example: 'Rua das Flores', required: false })
  @IsOptional()
  @IsString()
  currentStreet?: string;

  @ApiProperty({ example: '123', required: false })
  @IsOptional()
  @IsString()
  currentNumber?: string;

  @ApiProperty({ example: 'Apto 45', required: false })
  @IsOptional()
  @IsString()
  currentComplement?: string;

  @ApiProperty({ example: 'Centro', required: false })
  @IsOptional()
  @IsString()
  currentDistrict?: string;

  @ApiProperty({ example: '(11) 3333-4444', required: false })
  @IsOptional()
  @IsString()
  currentPhone?: string;

  @ApiProperty({ example: '01234-567', required: false })
  @IsOptional()
  @IsString()
  originCep?: string;

  @ApiProperty({ example: 'SP', required: false })
  @IsOptional()
  @IsString()
  originState?: string;

  @ApiProperty({ example: 'São Paulo', required: false })
  @IsOptional()
  @IsString()
  originCity?: string;

  @ApiProperty({ example: 'Rua das Palmeiras', required: false })
  @IsOptional()
  @IsString()
  originStreet?: string;

  @ApiProperty({ example: '456', required: false })
  @IsOptional()
  @IsString()
  originNumber?: string;

  @ApiProperty({ example: 'Casa', required: false })
  @IsOptional()
  @IsString()
  originComplement?: string;

  @ApiProperty({ example: 'Jardim', required: false })
  @IsOptional()
  @IsString()
  originDistrict?: string;

  @ApiProperty({ example: '(11) 2222-3333', required: false })
  @IsOptional()
  @IsString()
  originPhone?: string;

  // 3. Contatos de Emergência
  @ApiProperty({ type: [EmergencyContactDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  @IsOptional()
  emergencyContacts?: EmergencyContactDto[] = [];

  // 4. Responsável Legal
  @ApiProperty({ example: 'Ana Silva', required: false })
  @IsOptional()
  @IsString()
  legalGuardianName?: string;

  @ApiProperty({ example: '987.654.321-00', required: false })
  @IsOptional()
  @IsString()
  legalGuardianCpf?: string;

  @ApiProperty({ example: '98.765.432-1', required: false })
  @IsOptional()
  @IsString()
  legalGuardianRg?: string;

  @ApiProperty({ example: '(11) 99999-8888', required: false })
  @IsOptional()
  @IsString()
  legalGuardianPhone?: string;

  @ApiProperty({ example: 'Curador', enum: ['Curador', 'Procurador', 'Responsável Familiar (Convencional)'], required: false })
  @EmptyToUndefined()
  @IsOptional()
  @IsEnum(['Curador', 'Procurador', 'Responsável Familiar (Convencional)'])
  legalGuardianType?: 'Curador' | 'Procurador' | 'Responsável Familiar (Convencional)';

  @ApiProperty({ example: '01234-567', required: false })
  @IsOptional()
  @IsString()
  legalGuardianCep?: string;

  @ApiProperty({ example: 'SP', required: false })
  @IsOptional()
  @IsString()
  legalGuardianState?: string;

  @ApiProperty({ example: 'São Paulo', required: false })
  @IsOptional()
  @IsString()
  legalGuardianCity?: string;

  @ApiProperty({ example: 'Rua dos Responsáveis', required: false })
  @IsOptional()
  @IsString()
  legalGuardianStreet?: string;

  @ApiProperty({ example: '789', required: false })
  @IsOptional()
  @IsString()
  legalGuardianNumber?: string;

  @ApiProperty({ example: 'Sala 10', required: false })
  @IsOptional()
  @IsString()
  legalGuardianComplement?: string;

  @ApiProperty({ example: 'Bela Vista', required: false })
  @IsOptional()
  @IsString()
  legalGuardianDistrict?: string;

  // 5. Admissão
  @ApiProperty({ example: '2025-01-15T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  admissionDate: string;

  @ApiProperty({ example: 'Voluntária', enum: ['Voluntária', 'Involuntária', 'Judicial'], required: false })
  @EmptyToUndefined()
  @IsOptional()
  @IsEnum(['Voluntária', 'Involuntária', 'Judicial'])
  admissionType?: 'Voluntária' | 'Involuntária' | 'Judicial';

  @ApiProperty({ example: 'Necessidade de cuidados especializados', required: false })
  @IsOptional()
  @IsString()
  admissionReason?: string;

  @ApiProperty({ example: 'Boas condições de saúde', required: false })
  @IsOptional()
  @IsString()
  admissionConditions?: string;

  @ApiProperty({ example: '2025-12-31T00:00:00.000Z', required: false })
  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  dischargeDate?: string | null;

  @ApiProperty({ example: 'Retorno à família', required: false })
  @IsOptional()
  @IsString()
  dischargeReason?: string;

  // 6. Saúde
  @ApiProperty({ example: 'Estável', required: false })
  @IsOptional()
  @IsString()
  healthStatus?: string;

  @ApiProperty({ example: 'A_POSITIVO', enum: ['A_POSITIVO', 'A_NEGATIVO', 'B_POSITIVO', 'B_NEGATIVO', 'AB_POSITIVO', 'AB_NEGATIVO', 'O_POSITIVO', 'O_NEGATIVO', 'NAO_INFORMADO'] })
  @IsEnum(['A_POSITIVO', 'A_NEGATIVO', 'B_POSITIVO', 'B_NEGATIVO', 'AB_POSITIVO', 'AB_NEGATIVO', 'O_POSITIVO', 'O_NEGATIVO', 'NAO_INFORMADO'])
  @IsOptional()
  bloodType?: 'A_POSITIVO' | 'A_NEGATIVO' | 'B_POSITIVO' | 'B_NEGATIVO' | 'AB_POSITIVO' | 'AB_NEGATIVO' | 'O_POSITIVO' | 'O_NEGATIVO' | 'NAO_INFORMADO' = 'NAO_INFORMADO';

  @ApiProperty({ example: 1.75, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3)
  height?: number;

  @ApiProperty({ example: 70.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  weight?: number;

  @ApiProperty({ example: 'Grau II - Parcialmente Dependente', enum: ['Grau I - Independente', 'Grau II - Parcialmente Dependente', 'Grau III - Totalmente Dependente'], required: false })
  @EmptyToUndefined()
  @IsOptional()
  @IsEnum(['Grau I - Independente', 'Grau II - Parcialmente Dependente', 'Grau III - Totalmente Dependente'])
  dependencyLevel?: 'Grau I - Independente' | 'Grau II - Parcialmente Dependente' | 'Grau III - Totalmente Dependente';

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  mobilityAid?: boolean;

  @ApiProperty({ example: 'Cadeira de rodas', required: false })
  @IsOptional()
  @IsString()
  specialNeeds?: string;

  @ApiProperty({ example: 'Mobilidade reduzida', required: false })
  @IsOptional()
  @IsString()
  functionalAspects?: string;

  @ApiProperty({ example: 'Losartana 50mg', required: false })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  medicationsOnAdmission?: string;

  @ApiProperty({ example: 'Lactose', required: false })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiProperty({ example: 'Hipertensão, Diabetes', required: false })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  chronicConditions?: string;

  @ApiProperty({ example: 'Sem lactose', required: false })
  @IsOptional()
  @IsString()
  dietaryRestrictions?: string;

  // 7. Convênios
  @ApiProperty({ type: [HealthPlanDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HealthPlanDto)
  @IsOptional()
  healthPlans?: HealthPlanDto[] = [];

  // 8. Pertences
  @ApiProperty({ example: ['Relógio', 'Óculos'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  belongings?: string[] = [];

  // 9. Acomodação
  @ApiProperty({ example: 'uuid-quarto', required: false })
  @EmptyToUndefined()
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiProperty({ example: 'uuid-leito', required: false })
  @EmptyToUndefined()
  @IsOptional()
  @IsUUID()
  bedId?: string;
}
