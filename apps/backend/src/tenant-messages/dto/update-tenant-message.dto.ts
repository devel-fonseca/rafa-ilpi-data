import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantMessageDto } from './create-tenant-message.dto';

export class UpdateTenantMessageDto extends PartialType(CreateTenantMessageDto) {}
