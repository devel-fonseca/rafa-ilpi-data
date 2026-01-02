import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { DeleteMessageDto } from './dto/delete-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionType } from '@prisma/client';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @RequirePermissions(PermissionType.SEND_MESSAGES)
  @ApiOperation({ summary: 'Criar nova mensagem' })
  @ApiResponse({ status: 201, description: 'Mensagem criada com sucesso' })
  create(@Body() createMessageDto: CreateMessageDto, @CurrentUser() user: any) {
    return this.messagesService.create(
      createMessageDto,
      user.tenantId,
      user.id,
    );
  }

  @Get('inbox')
  @RequirePermissions(PermissionType.VIEW_MESSAGES)
  @ApiOperation({ summary: 'Listar mensagens recebidas (inbox)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findInbox(@Query() query: QueryMessagesDto, @CurrentUser() user: any) {
    return this.messagesService.findInbox(query, user.tenantId, user.id);
  }

  @Get('sent')
  @RequirePermissions(PermissionType.VIEW_MESSAGES)
  @ApiOperation({ summary: 'Listar mensagens enviadas' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findSent(@Query() query: QueryMessagesDto, @CurrentUser() user: any) {
    return this.messagesService.findSent(query, user.tenantId, user.id);
  }

  @Get('unread/count')
  @RequirePermissions(PermissionType.VIEW_MESSAGES)
  @ApiOperation({ summary: 'Contar mensagens não lidas' })
  countUnread(@CurrentUser() user: any) {
    return this.messagesService.countUnread(user.tenantId, user.id);
  }

  @Get('stats')
  @RequirePermissions(PermissionType.VIEW_MESSAGES)
  @ApiOperation({ summary: 'Estatísticas de mensagens' })
  getStats(@CurrentUser() user: any) {
    return this.messagesService.getStats(user.tenantId, user.id);
  }

  @Get(':id/read-stats')
  @RequirePermissions(PermissionType.VIEW_MESSAGES)
  @ApiOperation({ summary: 'Estatísticas de leitura de uma mensagem (para remetentes)' })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas com sucesso' })
  @ApiResponse({ status: 404, description: 'Mensagem não encontrada ou sem permissão' })
  getReadStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.messagesService.getReadStats(id, user.tenantId, user.id);
  }

  @Get('thread/:threadId')
  @RequirePermissions(PermissionType.VIEW_MESSAGES)
  @ApiOperation({ summary: 'Buscar thread completo (mensagem + respostas)' })
  findThread(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: any,
  ) {
    return this.messagesService.findThread(threadId, user.tenantId, user.id);
  }

  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_MESSAGES)
  @ApiOperation({ summary: 'Buscar mensagem por ID (auto-marca como lida)' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.messagesService.findOne(id, user.tenantId, user.id);
  }

  @Post('read')
  @RequirePermissions(PermissionType.VIEW_MESSAGES)
  @ApiOperation({ summary: 'Marcar mensagens como lidas' })
  markAsRead(@Body() markAsReadDto: MarkAsReadDto, @CurrentUser() user: any) {
    return this.messagesService.markAsRead(
      markAsReadDto,
      user.tenantId,
      user.id,
    );
  }

  @Delete(':id')
  @RequirePermissions(PermissionType.DELETE_MESSAGES)
  @ApiOperation({ summary: 'Deletar mensagem (soft delete)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteMessageDto: DeleteMessageDto,
    @CurrentUser() user: any,
  ) {
    return this.messagesService.delete(
      id,
      deleteMessageDto,
      user.tenantId,
      user.id,
    );
  }
}
