import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
} from '@nestjs/common'
import { BedsService } from './beds.service'
import { CreateBedDto, UpdateBedDto } from './dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { AuditInterceptor } from '../audit/audit.interceptor'
import { AuditAction } from '../audit/audit.decorator'

@Controller('beds')
@UseInterceptors(AuditInterceptor)
export class BedsController {
  constructor(private readonly bedsService: BedsService) {}

  @Post()
  @Roles('admin', 'user')
  @AuditAction('CREATE')
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() createBedDto: CreateBedDto
  ) {
    return this.bedsService.create(tenantId, createBedDto)
  }

  @Get()
  @Roles('admin', 'user')
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
  @Roles('admin', 'user')
  getOccupancyStats(@CurrentUser('tenantId') tenantId: string) {
    return this.bedsService.getOccupancyStats(tenantId)
  }

  @Get('map/full')
  @Roles('admin', 'user')
  getFullMap(
    @CurrentUser('tenantId') tenantId: string,
    @Query('buildingId') buildingId?: string
  ) {
    return this.bedsService.getFullMap(tenantId, buildingId)
  }

  @Get(':id')
  @Roles('admin', 'user')
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.bedsService.findOne(tenantId, id)
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @AuditAction('UPDATE')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateBedDto: UpdateBedDto
  ) {
    return this.bedsService.update(tenantId, id, updateBedDto)
  }

  @Delete(':id')
  @Roles('admin')
  @AuditAction('DELETE')
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.bedsService.remove(tenantId, id)
  }
}
