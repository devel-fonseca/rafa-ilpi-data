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
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { NotificationsService } from './notifications.service'
import { CreateNotificationDto } from './dto/create-notification.dto'
import { QueryNotificationDto } from './dto/query-notification.dto'
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

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
  async findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryNotificationDto) {
    const userId = user.id
    return this.notificationsService.findAll(userId, query)
  }

  /**
   * GET /notifications/unread/count
   * Contar notificações não lidas
   */
  @Get('unread/count')
  async countUnread(@CurrentUser() user: JwtPayload) {
    const userId = user.id
    return this.notificationsService.countUnread(userId)
  }

  /**
   * PATCH /notifications/:id/read
   * Marcar notificação como lida
   */
  @Patch(':id/read')
  async markAsRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const userId = user.id
    return this.notificationsService.markAsRead(userId, id)
  }

  /**
   * PATCH /notifications/:id/unread
   * Marcar notificação como não lida
   */
  @Patch(':id/unread')
  async markAsUnread(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const userId = user.id
    return this.notificationsService.markAsUnread(userId, id)
  }

  /**
   * PATCH /notifications/read-all
   * Marcar todas as notificações como lidas
   */
  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    const userId = user.id
    return this.notificationsService.markAllAsRead(userId)
  }

  /**
   * DELETE /notifications/:id
   * Deletar notificação
   */
  @Delete(':id')
  async delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const userId = user.id
    return this.notificationsService.delete(userId, id)
  }
}
