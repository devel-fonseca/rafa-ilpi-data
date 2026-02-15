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
import { FullMapResponseDto } from '../buildings/dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator'
import { AuditAction, AuditEntity } from '../audit/audit.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../permissions/guards/permissions.guard'
import { PermissionType } from '@prisma/client'
import { FeatureGuard } from '../common/guards/feature.guard'
import { RequireFeatures } from '../common/decorators/require-features.decorator'

@Controller('beds')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@AuditEntity('Bed')
export class BedsController {
  constructor(private readonly bedsService: BedsService) {}

  @Post()
  @RequireFeatures('gestao_leitos')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('CREATE')
  create(
    @Body() createBedDto: CreateBedDto
  ) {
    return this.bedsService.create(createBedDto)
  }

  @Get()
  @RequireFeatures('gestao_leitos')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('roomId') roomId?: string,
    @Query('status') status?: string
  ) {
    return this.bedsService.findAll(
      parseInt(skip || '0'),
      parseInt(take || '50'),
      roomId,
      status
    )
  }

  @Get('stats/occupancy')
  @RequireFeatures('mapa_leitos')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  getOccupancyStats() {
    return this.bedsService.getOccupancyStats()
  }

  @Get('map/full')
  @RequireFeatures('mapa_leitos')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  getFullMap(
    @Query('buildingId') buildingId?: string
  ): Promise<FullMapResponseDto> {
    return this.bedsService.getFullMap(buildingId)
  }

  @Get('status-history')
  @RequireFeatures('gestao_leitos')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  getBedStatusHistory(
    @Query('bedId') bedId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    return this.bedsService.getBedStatusHistory(
      bedId,
      parseInt(skip || '0'),
      parseInt(take || '50')
    )
  }

  @Get(':id')
  @RequireFeatures('gestao_leitos')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findOne(@Param('id') id: string) {
    return this.bedsService.findOne(id)
  }

  @Patch(':id')
  @RequireFeatures('gestao_leitos')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('UPDATE')
  update(
    @Param('id') id: string,
    @Body() updateBedDto: UpdateBedDto
  ) {
    return this.bedsService.update(id, updateBedDto)
  }

  @Delete(':id')
  @RequireFeatures('gestao_leitos')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('DELETE')
  remove(@Param('id') id: string) {
    return this.bedsService.remove(id)
  }

  @Post(':id/reserve')
  @RequireFeatures('gestao_leitos')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('RESERVE_BED')
  @HttpCode(HttpStatus.OK)
  reserveBed(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() reserveBedDto: ReserveBedDto
  ) {
    return this.bedsService.reserveBed(id, userId, reserveBedDto)
  }

  @Post(':id/block')
  @RequireFeatures('gestao_leitos')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('BLOCK_BED')
  @HttpCode(HttpStatus.OK)
  blockBed(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() blockBedDto: BlockBedDto
  ) {
    return this.bedsService.blockBed(id, userId, blockBedDto)
  }

  @Post(':id/release')
  @RequireFeatures('gestao_leitos')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('RELEASE_BED')
  @HttpCode(HttpStatus.OK)
  releaseBed(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() releaseBedDto: ReleaseBedDto
  ) {
    return this.bedsService.releaseBed(id, userId, releaseBedDto)
  }
}
