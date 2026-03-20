import { IsString, IsOptional, IsEmail, Matches } from 'class-validator'

export class UpdateSuperAdminTenantDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Telefone inválido' })
  phone?: string

  @IsOptional()
  @IsString()
  addressStreet?: string

  @IsOptional()
  @IsString()
  addressNumber?: string

  @IsOptional()
  @IsString()
  addressComplement?: string

  @IsOptional()
  @IsString()
  addressDistrict?: string

  @IsOptional()
  @IsString()
  addressCity?: string

  @IsOptional()
  @IsString()
  addressState?: string

  @IsOptional()
  @IsString()
  addressZipCode?: string
}
