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
import { BedsService } from './beds.service'
import { CreateBedDto, UpdateBedDto } from './dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator'
import { AuditAction, AuditEntity } from '../audit/audit.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../permissions/guards/permissions.guard'
import { PermissionType } from '@prisma/client'

@Controller('beds')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('Bed')
export class BedsController {
  constructor(private readonly bedsService: BedsService) {}

  @Post()
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('CREATE')
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() createBedDto: CreateBedDto
  ) {
    return this.bedsService.create(tenantId, createBedDto)
  }

  @Get()
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('roomId') roomId?: string,
    @Query('status') status?: string
  ) {
    return this.bedsService.findAll(
      tenantId,
      parseInt(skip || '0'),
      parseInt(take || '50'),
      roomId,
      status
    )
  }

  @Get('stats/occupancy')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  getOccupancyStats(@CurrentUser('tenantId') tenantId: string) {
    return this.bedsService.getOccupancyStats(tenantId)
  }

  @Get('map/full')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  getFullMap(
    @CurrentUser('tenantId') tenantId: string,
    @Query('buildingId') buildingId?: string
  ) {
    return this.bedsService.getFullMap(tenantId, buildingId)
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.bedsService.findOne(tenantId, id)
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('UPDATE')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateBedDto: UpdateBedDto
  ) {
    return this.bedsService.update(tenantId, id, updateBedDto)
  }

  @Delete(':id')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('DELETE')
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.bedsService.remove(tenantId, id)
  }
}
