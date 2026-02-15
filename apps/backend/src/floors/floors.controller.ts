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
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator'
import { AuditAction, AuditEntity } from '../audit/audit.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../permissions/guards/permissions.guard'
import { PermissionType } from '@prisma/client'
import { FeatureGuard } from '../common/guards/feature.guard'
import { RequireFeatures } from '../common/decorators/require-features.decorator'

@Controller('floors')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeatures('quartos')
@AuditEntity('Floor')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Post()
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('CREATE')
  create(
    @Body() createFloorDto: CreateFloorDto
  ) {
    return this.floorsService.create(createFloorDto)
  }

  @Get()
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('buildingId') buildingId?: string
  ) {
    return this.floorsService.findAll(
      parseInt(skip || '0'),
      parseInt(take || '50'),
      buildingId
    )
  }

  @Get('stats/summary')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  getStats() {
    return this.floorsService.getStats()
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findOne(@Param('id') id: string) {
    return this.floorsService.findOne(id)
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('UPDATE')
  update(
    @Param('id') id: string,
    @Body() updateFloorDto: UpdateFloorDto
  ) {
    return this.floorsService.update(id, updateFloorDto)
  }

  @Delete(':id')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('DELETE')
  remove(@Param('id') id: string) {
    return this.floorsService.remove(id)
  }
}
