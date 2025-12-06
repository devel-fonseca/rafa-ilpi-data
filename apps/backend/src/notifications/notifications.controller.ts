import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { NotificationsService } from './notifications.service'
import { CreateNotificationDto } from './dto/create-notification.dto'
import { QueryNotificationDto } from './dto/query-notification.dto'

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * POST /notifications
   * Criar nova notificação (normalmente chamado internamente por outros services)
   */
  @Post()
  async create(@Request() req: any, @Body() dto: CreateNotificationDto) {
    const tenantId = req.user.tenantId
    return this.notificationsService.create(tenantId, dto)
  }

  /**
   * GET /notifications
   * Listar notificações com filtros e paginação
   */
  @Get()
  async findAll(@Request() req: any, @Query() query: QueryNotificationDto) {
    // DEBUG: Log completo do req.user e query
    console.log('🔍 [CONTROLLER] req.user:', JSON.stringify(req.user, null, 2))
    console.log('🔍 [CONTROLLER] query.read:', query.read, 'typeof:', typeof query.read)
    const tenantId = req.user.tenantId
    const userId = req.user.id // CORRIGIDO: usar 'id' em vez de 'sub'
    console.log('🔍 [CONTROLLER] tenantId:', tenantId, 'userId:', userId)
    return this.notificationsService.findAll(tenantId, userId, query)
  }

  /**
   * GET /notifications/unread/count
   * Contar notificações não lidas
   */
  @Get('unread/count')
  async countUnread(@Request() req: any) {
    const tenantId = req.user.tenantId
    const userId = req.user.id
    return this.notificationsService.countUnread(tenantId, userId)
  }

  /**
   * PATCH /notifications/:id/read
   * Marcar notificação como lida
   */
  @Patch(':id/read')
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId
    const userId = req.user.id
    return this.notificationsService.markAsRead(tenantId, userId, id)
  }

  /**
   * PATCH /notifications/read-all
   * Marcar todas as notificações como lidas
   */
  @Patch('read-all')
  async markAllAsRead(@Request() req: any) {
    const tenantId = req.user.tenantId
    const userId = req.user.id
    return this.notificationsService.markAllAsRead(tenantId, userId)
  }

  /**
   * DELETE /notifications/:id
   * Deletar notificação
   */
  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId
    const userId = req.user.id
    return this.notificationsService.delete(tenantId, userId, id)
  }
}
