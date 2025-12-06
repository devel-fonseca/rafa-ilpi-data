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
import { BuildingsService } from './buildings.service'
import { CreateBuildingDto, UpdateBuildingDto } from './dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator'
import { AuditAction, AuditEntity } from '../audit/audit.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../permissions/guards/permissions.guard'
import { PermissionType } from '@prisma/client'

@Controller('buildings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('Building')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('CREATE')
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() createBuildingDto: CreateBuildingDto
  ) {
    return this.buildingsService.create(tenantId, createBuildingDto)
  }

  @Get()
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    return this.buildingsService.findAll(tenantId, parseInt(skip || '0'), parseInt(take || '50'))
  }

  @Get('stats/summary')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.buildingsService.getStats(tenantId)
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string
  ) {
    return this.buildingsService.findOne(tenantId, id)
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('UPDATE')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateBuildingDto: UpdateBuildingDto
  ) {
    return this.buildingsService.update(tenantId, id, updateBuildingDto)
  }

  @Delete(':id')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('DELETE')
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string
  ) {
    return this.buildingsService.remove(tenantId, id)
  }

  @Post('structure')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('CREATE')
  createStructure(
    @CurrentUser('tenantId') tenantId: string,
    @Body() data: any
  ) {
    return this.buildingsService.createBuildingStructure(tenantId, data)
  }
}
