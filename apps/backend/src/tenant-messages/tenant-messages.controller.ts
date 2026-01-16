import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TenantMessagesService } from './tenant-messages.service';
import { CreateTenantMessageDto, UpdateTenantMessageDto } from './dto';
import { TenantMessageStatus } from '@prisma/client';

@Controller('tenant-messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantMessagesController {
  constructor(private readonly tenantMessagesService: TenantMessagesService) {}

  /**
   * Criar nova mensagem (apenas SuperAdmin)
   * POST /api/tenant-messages
   */
  @Post()
  @Roles('superadmin')
  async create(@Body() dto: CreateTenantMessageDto, @Request() req: Request & { user: JwtPayload }) {
    return this.tenantMessagesService.create(dto, req.user.id);
  }

  /**
   * Listar mensagens (apenas SuperAdmin)
   * GET /api/tenant-messages
   */
  @Get()
  @Roles('superadmin')
  async findAll(
    @Query('status') status?: TenantMessageStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tenantMessagesService.findAll({
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Buscar mensagem específica (apenas SuperAdmin)
   * GET /api/tenant-messages/:id
   */
  @Get(':id')
  @Roles('superadmin')
  async findOne(@Param('id') id: string) {
    return this.tenantMessagesService.findOne(id);
  }

  /**
   * Atualizar mensagem (apenas SuperAdmin)
   * PUT /api/tenant-messages/:id
   */
  @Put(':id')
  @Roles('superadmin')
  async update(@Param('id') id: string, @Body() dto: UpdateTenantMessageDto) {
    return this.tenantMessagesService.update(id, dto);
  }

  /**
   * Deletar mensagem (apenas SuperAdmin)
   * DELETE /api/tenant-messages/:id
   */
  @Delete(':id')
  @Roles('superadmin')
  async remove(@Param('id') id: string) {
    await this.tenantMessagesService.remove(id);
    return { message: 'Mensagem deletada com sucesso' };
  }

  /**
   * Enviar mensagem imediatamente (apenas SuperAdmin)
   * POST /api/tenant-messages/:id/send
   */
  @Post(':id/send')
  @Roles('superadmin')
  async send(@Param('id') id: string) {
    return this.tenantMessagesService.send(id);
  }
}
