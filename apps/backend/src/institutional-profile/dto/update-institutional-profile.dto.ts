import { IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { UpdateTenantProfileDto } from './update-tenant-profile.dto'
import { UpdateTenantDto } from './update-tenant.dto'

export class UpdateInstitutionalProfileDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTenantProfileDto)
  profile?: UpdateTenantProfileDto

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTenantDto)
  tenant?: UpdateTenantDto
}
