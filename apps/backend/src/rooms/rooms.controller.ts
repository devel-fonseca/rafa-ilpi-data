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
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator'
import { AuditAction, AuditEntity } from '../audit/audit.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../permissions/guards/permissions.guard'
import { PermissionType } from '@prisma/client'

@Controller('rooms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('Room')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('CREATE')
  create(
    @Body() createRoomDto: CreateRoomDto
  ) {
    return this.roomsService.create(createRoomDto)
  }

  @Get()
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('floorId') floorId?: string
  ) {
    return this.roomsService.findAll(
      parseInt(skip || '0'),
      parseInt(take || '50'),
      floorId
    )
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_BEDS)
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id)
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('UPDATE')
  update(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto
  ) {
    return this.roomsService.update(id, updateRoomDto)
  }

  @Delete(':id')
  @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  @AuditAction('DELETE')
  remove(@Param('id') id: string) {
    return this.roomsService.remove(id)
  }
}
