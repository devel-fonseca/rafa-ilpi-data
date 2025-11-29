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
import { Roles } from '../auth/decorators/roles.decorator'
import { AuditAction, AuditEntity } from '../audit/audit.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'

@Controller('buildings')
@UseGuards(JwtAuthGuard, RolesGuard)
@AuditEntity('Building')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  @Roles('admin', 'user')
  @AuditAction('CREATE')
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() createBuildingDto: CreateBuildingDto
  ) {
    return this.buildingsService.create(tenantId, createBuildingDto)
  }

  @Get()
  @Roles('admin', 'user')
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    return this.buildingsService.findAll(tenantId, parseInt(skip || '0'), parseInt(take || '50'))
  }

  @Get('stats/summary')
  @Roles('admin', 'user')
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.buildingsService.getStats(tenantId)
  }

  @Get(':id')
  @Roles('admin', 'user')
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string
  ) {
    return this.buildingsService.findOne(tenantId, id)
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @AuditAction('UPDATE')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateBuildingDto: UpdateBuildingDto
  ) {
    return this.buildingsService.update(tenantId, id, updateBuildingDto)
  }

  @Delete(':id')
  @Roles('admin')
  @AuditAction('DELETE')
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string
  ) {
    return this.buildingsService.remove(tenantId, id)
  }

  @Post('structure')
  @Roles('admin', 'user')
  @AuditAction('CREATE')
  createStructure(
    @CurrentUser('tenantId') tenantId: string,
    @Body() data: any
  ) {
    return this.buildingsService.createBuildingStructure(tenantId, data)
  }
}
