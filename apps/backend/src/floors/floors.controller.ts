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
import { FloorsService } from './floors.service'
import { CreateFloorDto, UpdateFloorDto } from './dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { AuditInterceptor } from '../audit/audit.interceptor'
import { AuditAction } from '../audit/audit.decorator'

@Controller('floors')
@UseInterceptors(AuditInterceptor)
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Post()
  @Roles('admin', 'user')
  @AuditAction('CREATE')
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() createFloorDto: CreateFloorDto
  ) {
    return this.floorsService.create(tenantId, createFloorDto)
  }

  @Get()
  @Roles('admin', 'user')
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
  @Roles('admin', 'user')
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.floorsService.getStats(tenantId)
  }

  @Get(':id')
  @Roles('admin', 'user')
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.floorsService.findOne(tenantId, id)
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @AuditAction('UPDATE')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateFloorDto: UpdateFloorDto
  ) {
    return this.floorsService.update(tenantId, id, updateFloorDto)
  }

  @Delete(':id')
  @Roles('admin')
  @AuditAction('DELETE')
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.floorsService.remove(tenantId, id)
  }
}
