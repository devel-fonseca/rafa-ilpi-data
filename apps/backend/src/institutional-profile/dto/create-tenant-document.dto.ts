import { IsString, IsOptional, IsDateString, IsArray, MaxLength } from 'class-validator'

export class CreateTenantDocumentDto {
  @IsString()
  @MaxLength(100)
  type: string

  @IsOptional()
  @IsDateString()
  issuedAt?: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuerEntity?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsString()
  notes?: string
}
