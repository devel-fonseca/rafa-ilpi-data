import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { DeleteMessageDto } from './dto/delete-message.dto';
import { MessageType, MessageStatus, PermissionType, Prisma } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly permissionsService: PermissionsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Criar nova mensagem (DIRECT ou BROADCAST)
   */
  async create(
    createMessageDto: CreateMessageDto,
    userId: string,
  ) {
    const { type, subject, body, recipientIds, threadId } = createMessageDto;

    // Validar BROADCAST (precisa de permissão especial)
    if (type === MessageType.BROADCAST) {
      const hasPermission = await this.permissionsService.hasPermission(
        userId,
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
      const allUsers = await this.tenantContext.client.user.findMany({
        where: {
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
      const user = await this.tenantContext.client.user.findFirst({
        where: {
          id: recipientId,
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
      const parentMessage = await this.tenantContext.client.message.findFirst({
        where: {
          id: threadId,
          deletedAt: null,
        },
      });

      if (!parentMessage) {
        throw new BadRequestException('Thread original não encontrada');
      }
    }

    // Criar mensagem e recipients em transação
    const message = await this.tenantContext.client.$transaction(async (tx) => {
      const newMessage = await tx.message.create({
        data: {
          tenantId: this.tenantContext.tenantId,
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
          tenantId: this.tenantContext.tenantId,
          status: MessageStatus.SENT,
        })),
      });

      return newMessage;
    });

    this.logger.info('Mensagem criada', {
      messageId: message.id,
      type,
      recipientsCount: recipients.length,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return message;
  }

  /**
   * Obter estatísticas de leitura de uma mensagem (para remetentes)
   */
  async getReadStats(messageId: string, userId: string) {
    // Buscar mensagem e validar que o usuário é o remetente
    const message = await this.tenantContext.client.message.findFirst({
      where: {
        id: messageId,
        senderId: userId,
        deletedAt: null,
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada ou sem permissão');
    }

    // Buscar todos os destinatários com status de leitura
    const recipients = await this.tenantContext.client.messageRecipient.findMany({
      where: {
        messageId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                profilePhoto: true,
                positionCode: true,
              },
            },
          },
        },
      },
      orderBy: [
        { readAt: { sort: 'desc', nulls: 'last' } }, // Lidos primeiro, ordenados por data
        { user: { name: 'asc' } }, // Depois por nome
      ],
    });

    // Separar em lidos e não lidos
    const read = recipients.filter((r) => r.readAt !== null);
    const unread = recipients.filter((r) => r.readAt === null);

    return {
      messageId,
      messageType: message.type,
      total: recipients.length,
      readCount: read.length,
      unreadCount: unread.length,
      readPercentage: recipients.length > 0
        ? Math.round((read.length / recipients.length) * 100)
        : 0,
      recipients: {
        read: read.map((r) => ({
          userId: r.userId,
          userName: r.user.name,
          userEmail: r.user.email,
          userPhoto: r.user.profile?.profilePhoto,
          positionCode: r.user.profile?.positionCode,
          readAt: r.readAt,
        })),
        unread: unread.map((r) => ({
          userId: r.userId,
          userName: r.user.name,
          userEmail: r.user.email,
          userPhoto: r.user.profile?.profilePhoto,
          positionCode: r.user.profile?.positionCode,
        })),
      },
    };
  }

  /**
   * Listar mensagens recebidas (inbox)
   */
  async findInbox(
    query: QueryMessagesDto,
    userId: string,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // DEBUG: Log
    this.logger.info('[INBOX] Query recebida', {
      query,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    // Construir filtros
    const where: Prisma.MessageRecipientWhereInput = {
      userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.unreadOnly) {
      where.status = { not: MessageStatus.READ };
    }

    // Incluir filtros da mensagem
    const messageWhere: Prisma.MessageWhereInput = { deletedAt: null };

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
      this.tenantContext.client.messageRecipient.findMany({
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
      this.tenantContext.client.messageRecipient.count({ where }),
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
  async findSent(query: QueryMessagesDto, userId: string) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Prisma.MessageWhereInput = {
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
      this.tenantContext.client.message.findMany({
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
      this.tenantContext.client.message.count({ where }),
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
  async findOne(messageId: string, userId: string) {
    const message = await this.tenantContext.client.message.findFirst({
      where: {
        id: messageId,
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
        await this.tenantContext.client.messageRecipient.update({
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
  async findThread(threadId: string, userId: string) {
    // Buscar mensagem original
    const originalMessage = await this.findOne(threadId, userId);

    // Buscar respostas
    const replies = await this.tenantContext.client.message.findMany({
      where: {
        threadId,
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
  async countUnread(userId: string) {
    const count = await this.tenantContext.client.messageRecipient.count({
      where: {
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
    userId: string,
  ) {
    const { messageIds } = markAsReadDto;

    const where: Prisma.MessageRecipientWhereInput = {
      userId,
      status: { not: MessageStatus.READ },
      message: {
        deletedAt: null,
      },
    };

    if (messageIds && messageIds.length > 0) {
      where.messageId = { in: messageIds };
    }

    const result = await this.tenantContext.client.messageRecipient.updateMany({
      where,
      data: {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    });

    this.logger.info('Mensagens marcadas como lidas', {
      count: result.count,
      userId,
      tenantId: this.tenantContext.tenantId,
    });

    return { updated: result.count };
  }

  /**
   * Deletar mensagem (soft delete - apenas remetente)
   */
  async delete(
    messageId: string,
    deleteMessageDto: DeleteMessageDto,
    userId: string,
  ) {
    const message = await this.tenantContext.client.message.findFirst({
      where: {
        id: messageId,
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

    await this.tenantContext.client.message.update({
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
      tenantId: this.tenantContext.tenantId,
      reason: deleteMessageDto.deleteReason,
    });

    return { message: 'Mensagem deletada com sucesso' };
  }

  /**
   * Estatísticas de mensagens
   */
  async getStats(userId: string) {
    const [unreadCount, receivedCount, sentCount] = await Promise.all([
      this.tenantContext.client.messageRecipient.count({
        where: {
          userId,
          status: { not: MessageStatus.READ },
          message: { deletedAt: null },
        },
      }),
      this.tenantContext.client.messageRecipient.count({
        where: {
          userId,
          message: { deletedAt: null },
        },
      }),
      this.tenantContext.client.message.count({
        where: {
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
