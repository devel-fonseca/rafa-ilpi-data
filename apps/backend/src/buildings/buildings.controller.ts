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
    @Body() createBuildingDto: CreateBuildingDto
  ) {
    return this.buildingsService.create(createBuildingDto)
  }

  @Get()
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    return this.buildingsService.findAll(parseInt(skip || '0'), parseInt(take || '50'))
  }

  @Get('stats/summary')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  getStats() {
    return this.buildingsService.getStats()
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findOne(
    @Param('id') id: string
  ) {
    return this.buildingsService.findOne(id)
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('UPDATE')
  update(
    @Param('id') id: string,
    @Body() updateBuildingDto: UpdateBuildingDto
  ) {
    return this.buildingsService.update(id, updateBuildingDto)
  }

  @Delete(':id')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('DELETE')
  remove(
    @Param('id') id: string
  ) {
    return this.buildingsService.remove(id)
  }

  @Post('structure')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('CREATE')
  createStructure(
    @Body() data: any
  ) {
    return this.buildingsService.createBuildingStructure(data)
  }
}
