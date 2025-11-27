import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator'

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
  notes?: string
}
