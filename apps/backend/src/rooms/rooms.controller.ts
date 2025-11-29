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
import { RoomsService } from './rooms.service'
import { CreateRoomDto, UpdateRoomDto } from './dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { AuditAction, AuditEntity } from '../audit/audit.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'

@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@AuditEntity('Room')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @Roles('admin', 'user')
  @AuditAction('CREATE')
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() createRoomDto: CreateRoomDto
  ) {
    return this.roomsService.create(tenantId, createRoomDto)
  }

  @Get()
  @Roles('admin', 'user')
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('floorId') floorId?: string
  ) {
    return this.roomsService.findAll(
      tenantId,
      parseInt(skip || '0'),
      parseInt(take || '50'),
      floorId
    )
  }

  @Get(':id')
  @Roles('admin', 'user')
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.roomsService.findOne(tenantId, id)
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @AuditAction('UPDATE')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto
  ) {
    return this.roomsService.update(tenantId, id, updateRoomDto)
  }

  @Delete(':id')
  @Roles('admin')
  @AuditAction('DELETE')
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.roomsService.remove(tenantId, id)
  }
}
