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
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { BedsService } from './beds.service'
import { CreateBedDto, UpdateBedDto, ReserveBedDto, BlockBedDto, ReleaseBedDto } from './dto'
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

  @Post(':id/reserve')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('RESERVE_BED')
  @HttpCode(HttpStatus.OK)
  reserveBed(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() reserveBedDto: ReserveBedDto
  ) {
    return this.bedsService.reserveBed(tenantId, id, userId, reserveBedDto)
  }

  @Post(':id/block')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('BLOCK_BED')
  @HttpCode(HttpStatus.OK)
  blockBed(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() blockBedDto: BlockBedDto
  ) {
    return this.bedsService.blockBed(tenantId, id, userId, blockBedDto)
  }

  @Post(':id/release')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('RELEASE_BED')
  @HttpCode(HttpStatus.OK)
  releaseBed(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() releaseBedDto: ReleaseBedDto
  ) {
    return this.bedsService.releaseBed(tenantId, id, userId, releaseBedDto)
  }

  @Get('status-history')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  getBedStatusHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Query('bedId') bedId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    return this.bedsService.getBedStatusHistory(
      tenantId,
      bedId,
      parseInt(skip || '0'),
      parseInt(take || '50')
    )
  }
}
