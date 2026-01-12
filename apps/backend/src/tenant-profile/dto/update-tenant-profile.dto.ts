import { PartialType } from '@nestjs/swagger';
import { CreateTenantProfileDto } from './create-tenant-profile.dto';

/**
 * DTO para atualização de TenantProfile
 * Todos os campos são opcionais (inclusive legalNature)
 */
export class UpdateTenantProfileDto extends PartialType(
  CreateTenantProfileDto,
) {}
