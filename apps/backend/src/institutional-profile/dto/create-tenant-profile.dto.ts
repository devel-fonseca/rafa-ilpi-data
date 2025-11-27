import { IsOptional, IsString, IsInt, IsEnum, IsUrl, IsDateString, MaxLength, Min } from 'class-validator'
import { LegalNature } from '@prisma/client'

export class CreateTenantProfileDto {
  @IsOptional()
  @IsEnum(LegalNature)
  legalNature?: LegalNature

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cnesCode?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  capacityDeclared?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  capacityLicensed?: number

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactEmail?: string

  @IsOptional()
  @IsUrl()
  websiteUrl?: string

  @IsOptional()
  @IsDateString()
  foundedAt?: string

  @IsOptional()
  @IsString()
  mission?: string

  @IsOptional()
  @IsString()
  vision?: string

  @IsOptional()
  @IsString()
  values?: string

  @IsOptional()
  @IsString()
  notes?: string
}
