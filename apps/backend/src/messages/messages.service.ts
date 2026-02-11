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
   * Tradeoff consciente sem migration:
   * - Inbox (destinatário): usamos status DELIVERED para representar "arquivada"
   * - Enviadas (remetente): usamos metadata.archivedBySenderIds (JSON)
   *
   * Isso evita mudança de schema agora, porém reusa DELIVERED com novo significado.
   */
  private isSenderArchived(metadata: Prisma.JsonValue | null, userId: string): boolean {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return false;
    }
    const raw = (metadata as Record<string, unknown>).archivedBySenderIds;
    if (!Array.isArray(raw)) return false;
    return raw.includes(userId);
  }

  private buildSenderArchiveMetadata(
    metadata: Prisma.JsonValue | null,
    userId: string,
    archived: boolean,
  ): Prisma.InputJsonValue {
    const base =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? { ...(metadata as Record<string, unknown>) }
        : {};

    const raw = base.archivedBySenderIds;
    const currentIds = Array.isArray(raw)
      ? raw.filter((id): id is string => typeof id === 'string')
      : [];

    const nextIds = archived
      ? Array.from(new Set([...currentIds, userId]))
      : currentIds.filter((id) => id !== userId);

    return {
      ...base,
      archivedBySenderIds: nextIds,
    };
  }

  private async getThreadMessageIds(messageId: string): Promise<string[]> {
    const baseMessage = await this.tenantContext.client.message.findFirst({
      where: {
        id: messageId,
        deletedAt: null,
      },
      select: {
        id: true,
        threadId: true,
      },
    });

    if (!baseMessage) {
      throw new NotFoundException('Mensagem não encontrada');
    }

    const rootId = baseMessage.threadId || baseMessage.id;
    const threadMessages = await this.tenantContext.client.message.findMany({
      where: {
        deletedAt: null,
        OR: [
          { id: rootId },
          { threadId: rootId },
        ],
      },
      select: { id: true },
    });

    return threadMessages.map((m) => m.id);
  }

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

    if (query.archivedOnly) {
      // Tradeoff: DELIVERED está sendo usado como "arquivada" na inbox.
      where.status = MessageStatus.DELIVERED;
    } else {
      // Define explicitamente os status "ativos" da inbox para evitar ambiguidades.
      where.status = { in: [MessageStatus.SENT, MessageStatus.READ] };
      if (query.status) {
        where.status = query.status;
      }
      if (query.unreadOnly) {
        where.status = MessageStatus.SENT;
      }
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
              _count: {
                select: {
                  replies: true,
                },
              },
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
        conversationRepliesCount: recipient.message._count?.replies || 0,
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

    // Tradeoff: filtro de arquivamento em enviadas é aplicado em memória
    // para evitar edge cases de JSON path em diferentes versões/ambientes.
    const raw = await this.tenantContext.client.message.findMany({
      where,
      orderBy: {
        createdAt: query.sortOrder || 'desc',
      },
      include: {
        _count: {
          select: {
            replies: true,
          },
        },
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
    });

    const filtered = raw.filter((message) => {
      const archived = this.isSenderArchived(message.metadata, userId);
      return query.archivedOnly ? archived : !archived;
    });

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const data = filtered.slice(skip, skip + limit).map((message) => ({
      ...message,
      conversationRepliesCount: message._count?.replies || 0,
    }));

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
  async findOne(messageId: string, userId: string, markAsRead = true) {
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
    if (isRecipient && markAsRead) {
      const recipient = message.recipients.find((r) => r.userId === userId);
      if (
        recipient &&
        recipient.status !== MessageStatus.READ &&
        recipient.status !== MessageStatus.DELIVERED
      ) {
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
    const originalMessage = await this.findOne(threadId, userId, false);

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
        status: MessageStatus.SENT,
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
      status: MessageStatus.SENT,
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
    const [unreadCount, receivedCount, sentRaw] = await Promise.all([
      this.tenantContext.client.messageRecipient.count({
        where: {
          userId,
          status: MessageStatus.SENT,
          message: { deletedAt: null },
        },
      }),
      this.tenantContext.client.messageRecipient.count({
        where: {
          userId,
          status: { not: MessageStatus.DELIVERED },
          message: { deletedAt: null },
        },
      }),
      this.tenantContext.client.message.findMany({
        where: {
          senderId: userId,
          deletedAt: null,
        },
        select: { metadata: true },
      }),
    ]);
    const sentCount = sentRaw.filter((m) => !this.isSenderArchived(m.metadata, userId)).length;

    return {
      unread: unreadCount,
      received: receivedCount,
      sent: sentCount,
    };
  }

  async archive(messageId: string, userId: string) {
    const message = await this.tenantContext.client.message.findFirst({
      where: {
        id: messageId,
        deletedAt: null,
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada');
    }

    // Regra de produto: arquivar uma mensagem arquiva a thread atual inteira
    // (somente mensagens já existentes; novas mensagens da thread voltam a aparecer).
    const threadMessageIds = await this.getThreadMessageIds(messageId);

    await this.tenantContext.client.$transaction(async (tx) => {
      const [recipientCount, senderMessages] = await Promise.all([
        tx.messageRecipient.count({
          where: {
            userId,
            messageId: { in: threadMessageIds },
          },
        }),
        tx.message.findMany({
          where: {
            id: { in: threadMessageIds },
            senderId: userId,
          },
          select: {
            id: true,
            metadata: true,
          },
        }),
      ]);

      if (!recipientCount && senderMessages.length === 0) {
        throw new ForbiddenException('Você não tem permissão para arquivar esta mensagem');
      }

      // Se o usuário participa da thread como destinatário, arquiva a visão de inbox.
      if (recipientCount > 0) {
        await tx.messageRecipient.updateMany({
          where: {
            userId,
            messageId: { in: threadMessageIds },
          },
          data: {
            status: MessageStatus.DELIVERED,
          },
        });
      }

      // Se o usuário participa da thread como remetente, arquiva a visão de enviadas.
      if (senderMessages.length > 0) {
        for (const senderMessage of senderMessages) {
          if (!this.isSenderArchived(senderMessage.metadata, userId)) {
            await tx.message.update({
              where: { id: senderMessage.id },
              data: {
                metadata: this.buildSenderArchiveMetadata(senderMessage.metadata, userId, true),
              },
            });
          }
        }
      }
    });

    return { message: 'Mensagem arquivada com sucesso' };
  }

  async unarchive(messageId: string, userId: string) {
    const message = await this.tenantContext.client.message.findFirst({
      where: {
        id: messageId,
        deletedAt: null,
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada');
    }

    const threadMessageIds = await this.getThreadMessageIds(messageId);

    await this.tenantContext.client.$transaction(async (tx) => {
      const [archivedRecipientCount, senderMessages] = await Promise.all([
        tx.messageRecipient.count({
          where: {
            userId,
            status: MessageStatus.DELIVERED,
            messageId: { in: threadMessageIds },
          },
        }),
        tx.message.findMany({
          where: {
            id: { in: threadMessageIds },
            senderId: userId,
          },
          select: {
            id: true,
            metadata: true,
          },
        }),
      ]);

      if (!archivedRecipientCount && senderMessages.length === 0) {
        throw new ForbiddenException('Você não tem permissão para desarquivar esta mensagem');
      }

      if (archivedRecipientCount > 0) {
        const archivedRecipients = await tx.messageRecipient.findMany({
          where: {
            userId,
            status: MessageStatus.DELIVERED,
            messageId: { in: threadMessageIds },
          },
          select: {
            id: true,
            readAt: true,
          },
        });

        for (const archivedRecipient of archivedRecipients) {
          await tx.messageRecipient.update({
            where: { id: archivedRecipient.id },
            data: {
              status: archivedRecipient.readAt ? MessageStatus.READ : MessageStatus.SENT,
            },
          });
        }
      }

      if (senderMessages.length > 0) {
        for (const senderMessage of senderMessages) {
          if (this.isSenderArchived(senderMessage.metadata, userId)) {
            await tx.message.update({
              where: { id: senderMessage.id },
              data: {
                metadata: this.buildSenderArchiveMetadata(senderMessage.metadata, userId, false),
              },
            });
          }
        }
      }
    });

    return { message: 'Mensagem desarquivada com sucesso' };
  }
}
