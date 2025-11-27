import { PartialType } from '@nestjs/mapped-types'
import { CreateTenantProfileDto } from './create-tenant-profile.dto'

export class UpdateTenantProfileDto extends PartialType(CreateTenantProfileDto) {}
