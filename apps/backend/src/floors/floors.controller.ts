import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common'
import { FloorsService } from './floors.service'
import { CreateFloorDto, UpdateFloorDto } from './dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator'
import { AuditAction, AuditEntity } from '../audit/audit.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../permissions/guards/permissions.guard'
import { PermissionType } from '@prisma/client'

@Controller('floors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('Floor')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Post()
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('CREATE')
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() createFloorDto: CreateFloorDto
  ) {
    return this.floorsService.create(tenantId, createFloorDto)
  }

  @Get()
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('buildingId') buildingId?: string
  ) {
    return this.floorsService.findAll(
      tenantId,
      parseInt(skip || '0'),
      parseInt(take || '50'),
      buildingId
    )
  }

  @Get('stats/summary')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.floorsService.getStats(tenantId)
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.floorsService.findOne(tenantId, id)
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('UPDATE')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateFloorDto: UpdateFloorDto
  ) {
    return this.floorsService.update(tenantId, id, updateFloorDto)
  }

  @Delete(':id')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('DELETE')
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.floorsService.remove(tenantId, id)
  }
}
