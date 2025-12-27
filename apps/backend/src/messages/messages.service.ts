import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { DeleteMessageDto } from './dto/delete-message.dto';
import { MessageType, MessageStatus, PermissionType } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Criar nova mensagem (DIRECT ou BROADCAST)
   */
  async create(
    createMessageDto: CreateMessageDto,
    tenantId: string,
    userId: string,
  ) {
    const { type, subject, body, recipientIds, threadId } = createMessageDto;

    // Validar BROADCAST (precisa de permissão especial)
    if (type === MessageType.BROADCAST) {
      const hasPermission = await this.permissionsService.hasPermission(
        userId,
        tenantId,
        PermissionType.BROADCAST_MESSAGES,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Você não tem permissão para enviar mensagens em broadcast',
        );
      }
    }

    // Determinar destinatários
    let recipients: string[] = [];

    if (type === MessageType.DIRECT) {
      if (!recipientIds || recipientIds.length === 0) {
        throw new BadRequestException(
          'Mensagens diretas requerem pelo menos um destinatário',
        );
      }
      recipients = recipientIds;
    } else {
      // BROADCAST: buscar todos usuários ativos do tenant (exceto remetente)
      const allUsers = await this.prisma.user.findMany({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          id: { not: userId },
        },
        select: { id: true },
      });
      recipients = allUsers.map((u) => u.id);
    }

    // Validar que destinatários existem e pertencem ao tenant
    for (const recipientId of recipients) {
      const user = await this.prisma.user.findFirst({
        where: {
          id: recipientId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!user) {
        throw new BadRequestException(
          `Destinatário ${recipientId} não encontrado ou não pertence ao tenant`,
        );
      }
    }

    // Validar threadId se for resposta
    if (threadId) {
      const parentMessage = await this.prisma.message.findFirst({
        where: {
          id: threadId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!parentMessage) {
        throw new BadRequestException('Thread original não encontrada');
      }
    }

    // Criar mensagem e recipients em transação
    const message = await this.prisma.$transaction(async (tx) => {
      const newMessage = await tx.message.create({
        data: {
          tenantId,
          senderId: userId,
          type,
          subject,
          body,
          threadId,
          isReply: !!threadId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: {
                select: {
                  profilePhoto: true,
                },
              },
            },
          },
        },
      });

      // Criar registros de recipients
      await tx.messageRecipient.createMany({
        data: recipients.map((recipientId) => ({
          messageId: newMessage.id,
          userId: recipientId,
          tenantId,
          status: MessageStatus.SENT,
        })),
      });

      return newMessage;
    });

    this.logger.info('Mensagem criada', {
      messageId: message.id,
      type,
      recipientsCount: recipients.length,
      tenantId,
      userId,
    });

    return message;
  }

  /**
   * Listar mensagens recebidas (inbox)
   */
  async findInbox(
    query: QueryMessagesDto,
    tenantId: string,
    userId: string,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // DEBUG: Log
    this.logger.info('[INBOX] Query recebida', {
      query,
      tenantId,
      userId,
    });

    // Construir filtros
    const where: any = {
      tenantId,
      userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.unreadOnly) {
      where.status = { not: MessageStatus.READ };
    }

    // Incluir filtros da mensagem
    const messageWhere: any = { deletedAt: null };

    if (query.type) {
      messageWhere.type = query.type;
    }

    if (query.search) {
      messageWhere.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { body: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    where.message = messageWhere;

    // DEBUG: Log do where final
    this.logger.info('[INBOX] Where construído', { where: JSON.stringify(where) });

    // Buscar com paginação
    const [data, total] = await Promise.all([
      this.prisma.messageRecipient.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: query.sortOrder || 'desc',
        },
        include: {
          message: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profile: {
                    select: {
                      profilePhoto: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.messageRecipient.count({ where }),
    ]);

    // DEBUG: Log dos resultados
    this.logger.info('[INBOX] Resultados', {
      dataCount: data.length,
      total,
    });

    return {
      data: data.map((recipient) => ({
        ...recipient.message,
        recipientStatus: recipient.status,
        recipientReadAt: recipient.readAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Listar mensagens enviadas
   */
  async findSent(query: QueryMessagesDto, tenantId: string, userId: string) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {
      tenantId,
      senderId: userId,
      deletedAt: null,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { body: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Buscar com paginação
    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: query.sortOrder || 'desc',
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          recipients: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Buscar mensagem por ID (auto-marca como lida se for recipiente)
   */
  async findOne(messageId: string, tenantId: string, userId: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        tenantId,
        deletedAt: null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                profilePhoto: true,
              },
            },
          },
        },
        recipients: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profile: {
                  select: {
                    profilePhoto: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada');
    }

    // Verificar se usuário é remetente ou destinatário
    const isRecipient = message.recipients.some((r) => r.userId === userId);
    const isSender = message.senderId === userId;

    if (!isSender && !isRecipient) {
      throw new ForbiddenException(
        'Você não tem permissão para visualizar esta mensagem',
      );
    }

    // Se é destinatário, marcar como lida automaticamente
    if (isRecipient) {
      const recipient = message.recipients.find((r) => r.userId === userId);
      if (recipient && recipient.status !== MessageStatus.READ) {
        await this.prisma.messageRecipient.update({
          where: { id: recipient.id },
          data: {
            status: MessageStatus.READ,
            readAt: new Date(),
          },
        });
      }
    }

    return message;
  }

  /**
   * Buscar thread completa (mensagem original + respostas)
   */
  async findThread(threadId: string, tenantId: string, userId: string) {
    // Buscar mensagem original
    const originalMessage = await this.findOne(threadId, tenantId, userId);

    // Buscar respostas
    const replies = await this.prisma.message.findMany({
      where: {
        threadId,
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    return {
      original: originalMessage,
      replies,
    };
  }

  /**
   * Contar mensagens não lidas
   */
  async countUnread(tenantId: string, userId: string) {
    const count = await this.prisma.messageRecipient.count({
      where: {
        tenantId,
        userId,
        status: { not: MessageStatus.READ },
        message: {
          deletedAt: null,
        },
      },
    });

    return { count };
  }

  /**
   * Marcar mensagens como lidas
   */
  async markAsRead(
    markAsReadDto: MarkAsReadDto,
    tenantId: string,
    userId: string,
  ) {
    const { messageIds } = markAsReadDto;

    const where: any = {
      tenantId,
      userId,
      status: { not: MessageStatus.READ },
      message: {
        deletedAt: null,
      },
    };

    if (messageIds && messageIds.length > 0) {
      where.messageId = { in: messageIds };
    }

    const result = await this.prisma.messageRecipient.updateMany({
      where,
      data: {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    });

    this.logger.info('Mensagens marcadas como lidas', {
      count: result.count,
      userId,
      tenantId,
    });

    return { updated: result.count };
  }

  /**
   * Deletar mensagem (soft delete - apenas remetente)
   */
  async delete(
    messageId: string,
    deleteMessageDto: DeleteMessageDto,
    tenantId: string,
    userId: string,
  ) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada');
    }

    // Apenas o remetente pode deletar
    if (message.senderId !== userId) {
      throw new ForbiddenException(
        'Apenas o remetente pode deletar a mensagem',
      );
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        metadata: {
          deleteReason: deleteMessageDto.deleteReason,
        },
      },
    });

    this.logger.info('Mensagem deletada', {
      messageId,
      userId,
      tenantId,
      reason: deleteMessageDto.deleteReason,
    });

    return { message: 'Mensagem deletada com sucesso' };
  }

  /**
   * Estatísticas de mensagens
   */
  async getStats(tenantId: string, userId: string) {
    const [unreadCount, receivedCount, sentCount] = await Promise.all([
      this.prisma.messageRecipient.count({
        where: {
          tenantId,
          userId,
          status: { not: MessageStatus.READ },
          message: { deletedAt: null },
        },
      }),
      this.prisma.messageRecipient.count({
        where: {
          tenantId,
          userId,
          message: { deletedAt: null },
        },
      }),
      this.prisma.message.count({
        where: {
          tenantId,
          senderId: userId,
          deletedAt: null,
        },
      }),
    ]);

    return {
      unread: unreadCount,
      received: receivedCount,
      sent: sentCount,
    };
  }
}
