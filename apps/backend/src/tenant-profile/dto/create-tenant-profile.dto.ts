import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  MaxLength,
  IsDateString,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LegalNature } from '@prisma/client';

export class CreateTenantProfileDto {
  // ════════════════════════════════════════════════════════════════
  // CAMPO OBRIGATÓRIO
  // ════════════════════════════════════════════════════════════════

  @ApiProperty({
    description: 'Natureza jurídica da instituição (OBRIGATÓRIO)',
    enum: LegalNature,
    example: 'ASSOCIACAO',
  })
  @IsEnum(LegalNature, {
    message:
      'Natureza jurídica deve ser: ASSOCIACAO, FUNDACAO, EMPRESA_PRIVADA ou MEI',
  })
  legalNature: LegalNature;

  // ════════════════════════════════════════════════════════════════
  // DADOS BÁSICOS (Opcionais)
  // ════════════════════════════════════════════════════════════════

  @ApiPropertyOptional({
    description: 'Nome fantasia da instituição',
    example: 'Casa de Repouso Feliz Idade',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string;

  @ApiPropertyOptional({
    description: 'Data de fundação da instituição',
    example: '2015-03-20',
  })
  @IsOptional()
  @IsDateString()
  foundedAt?: string;

  @ApiPropertyOptional({
    description: 'Website da instituição',
    example: 'https://www.exemplo.com.br',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL do website inválida' })
  websiteUrl?: string;

  // ════════════════════════════════════════════════════════════════
  // CAPACIDADE E REGULATÓRIO (Opcionais)
  // ════════════════════════════════════════════════════════════════

  @ApiPropertyOptional({
    description: 'Código CNES (7 dígitos)',
    example: '1234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cnesCode?: string;

  @ApiPropertyOptional({
    description: 'Capacidade declarada de residentes',
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Capacidade declarada deve ser no mínimo 1' })
  capacityDeclared?: number;

  @ApiPropertyOptional({
    description: 'Capacidade licenciada pela vigilância sanitária',
    example: 45,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Capacidade licenciada deve ser no mínimo 1' })
  capacityLicensed?: number;

  @ApiPropertyOptional({
    description: 'Notas/observações sobre a instituição',
    example: 'Instituição especializada em cuidados geriátricos',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  // ════════════════════════════════════════════════════════════════
  // CONTATOS INSTITUCIONAIS (Opcionais)
  // ════════════════════════════════════════════════════════════════

  @ApiPropertyOptional({
    description: 'Telefone de contato institucional',
    example: '(11) 98765-4321',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Email de contato institucional',
    example: 'contato@instituicao.com.br',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactEmail?: string;

  // ════════════════════════════════════════════════════════════════
  // IDENTIDADE VISUAL E VALORES (Opcionais)
  // ════════════════════════════════════════════════════════════════

  @ApiPropertyOptional({
    description: 'URL do logo no storage',
    example: 'https://storage.example.com/logos/tenant-123.png',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Chave do logo no storage (para deleção)',
    example: 'tenants/logos/abc123.png',
  })
  @IsOptional()
  @IsString()
  logoKey?: string;

  @ApiPropertyOptional({
    description: 'Missão institucional',
    example:
      'Proporcionar cuidado humanizado e qualidade de vida aos nossos residentes',
  })
  @IsOptional()
  @IsString()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Visão institucional',
    example:
      'Ser referência em cuidados geriátricos no Brasil até 2030',
  })
  @IsOptional()
  @IsString()
  vision?: string;

  @ApiPropertyOptional({
    description: 'Valores institucionais',
    example:
      'Respeito, empatia, profissionalismo, transparência e ética',
  })
  @IsOptional()
  @IsString()
  values?: string;
}
