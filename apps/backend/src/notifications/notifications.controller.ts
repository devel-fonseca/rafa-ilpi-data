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
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto)
  }

  /**
   * GET /notifications
   * Listar notificações com filtros e paginação
   */
  @Get()
  async findAll(@Request() req: any, @Query() query: QueryNotificationDto) {
    const userId = req.user.id
    return this.notificationsService.findAll(userId, query)
  }

  /**
   * GET /notifications/unread/count
   * Contar notificações não lidas
   */
  @Get('unread/count')
  async countUnread(@Request() req: any) {
    const userId = req.user.id
    return this.notificationsService.countUnread(userId)
  }

  /**
   * PATCH /notifications/:id/read
   * Marcar notificação como lida
   */
  @Patch(':id/read')
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id
    return this.notificationsService.markAsRead(userId, id)
  }

  /**
   * PATCH /notifications/read-all
   * Marcar todas as notificações como lidas
   */
  @Patch('read-all')
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.id
    return this.notificationsService.markAllAsRead(userId)
  }

  /**
   * DELETE /notifications/:id
   * Deletar notificação
   */
  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id
    return this.notificationsService.delete(userId, id)
  }
}
