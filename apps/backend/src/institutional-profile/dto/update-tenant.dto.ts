import { IsOptional, IsString, IsEmail, MaxLength, Matches } from 'class-validator'

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(9)
  @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP deve estar no formato 00000-000' })
  addressZipCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressStreet?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  addressNumber?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressComplement?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressDistrict?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressCity?: string

  @IsOptional()
  @IsString()
  @MaxLength(2)
  @Matches(/^[A-Z]{2}$/, { message: 'Estado deve ser uma sigla de 2 letras maiúsculas (ex: SP)' })
  addressState?: string
}
