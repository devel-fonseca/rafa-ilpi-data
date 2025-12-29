import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  TenantMessage,
  MessageRecipientFilter,
  TenantMessageStatus,
  TenantStatus,
  InvoiceStatus,
} from '@prisma/client';
import { CreateTenantMessageDto, UpdateTenantMessageDto } from './dto';

@Injectable()
export class TenantMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Criar nova mensagem (draft ou agendada)
   */
  async create(
    dto: CreateTenantMessageDto,
    createdBy: string,
  ): Promise<TenantMessage> {
    // Validar specificTenantIds se filtro for SPECIFIC_TENANTS
    if (dto.recipientFilter === MessageRecipientFilter.SPECIFIC_TENANTS) {
      if (!dto.specificTenantIds || dto.specificTenantIds.length === 0) {
        throw new BadRequestException(
          'specificTenantIds é obrigatório quando recipientFilter é SPECIFIC_TENANTS',
        );
      }
    }

    const status = dto.scheduledFor
      ? TenantMessageStatus.SCHEDULED
      : TenantMessageStatus.DRAFT;

    return this.prisma.tenantMessage.create({
      data: {
        title: dto.title,
        subject: dto.subject,
        htmlContent: dto.htmlContent,
        recipientFilter: dto.recipientFilter,
        specificTenantIds: dto.specificTenantIds || [],
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        status,
        createdBy,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Listar mensagens
   */
  async findAll(filters?: {
    status?: TenantMessageStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ messages: TenantMessage[]; total: number }> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    const [messages, total] = await Promise.all([
      this.prisma.tenantMessage.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.tenantMessage.count({ where }),
    ]);

    return { messages, total };
  }

  /**
   * Buscar mensagem específica
   */
  async findOne(id: string): Promise<TenantMessage> {
    const message = await this.prisma.tenantMessage.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada');
    }

    return message;
  }

  /**
   * Atualizar mensagem (apenas se ainda for DRAFT ou SCHEDULED)
   */
  async update(id: string, dto: UpdateTenantMessageDto): Promise<TenantMessage> {
    const message = await this.findOne(id);

    if (message.status === TenantMessageStatus.SENT || message.status === TenantMessageStatus.SENDING) {
      throw new BadRequestException(
        'Não é possível editar mensagem que já foi enviada ou está sendo enviada',
      );
    }

    return this.prisma.tenantMessage.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.subject && { subject: dto.subject }),
        ...(dto.htmlContent && { htmlContent: dto.htmlContent }),
        ...(dto.recipientFilter && { recipientFilter: dto.recipientFilter }),
        ...(dto.specificTenantIds && { specificTenantIds: dto.specificTenantIds }),
        ...(dto.scheduledFor !== undefined && {
          scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
          status: dto.scheduledFor ? TenantMessageStatus.SCHEDULED : TenantMessageStatus.DRAFT,
        }),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Deletar mensagem (apenas se for DRAFT)
   */
  async remove(id: string): Promise<void> {
    const message = await this.findOne(id);

    if (message.status !== TenantMessageStatus.DRAFT) {
      throw new BadRequestException('Apenas mensagens em rascunho podem ser deletadas');
    }

    await this.prisma.tenantMessage.delete({ where: { id } });
  }

  /**
   * Enviar mensagem imediatamente
   */
  async send(id: string): Promise<TenantMessage> {
    const message = await this.findOne(id);

    if (message.status === TenantMessageStatus.SENT) {
      throw new BadRequestException('Mensagem já foi enviada');
    }

    if (message.status === TenantMessageStatus.SENDING) {
      throw new BadRequestException('Mensagem já está sendo enviada');
    }

    // Marcar como SENDING
    await this.prisma.tenantMessage.update({
      where: { id },
      data: { status: TenantMessageStatus.SENDING },
    });

    // Buscar destinatários baseado no filtro
    const recipients = await this.getRecipients(
      message.recipientFilter,
      message.specificTenantIds,
    );

    let sentCount = 0;
    let failedCount = 0;

    // Enviar email para cada tenant (em paralelo com Promise.allSettled)
    const emailPromises = recipients.map(async (tenant) => {
      const result = await this.emailService.sendGenericEmail(
        tenant.email,
        tenant.name,
        message.subject,
        message.htmlContent,
        tenant.id,
      );

      if (result.success) {
        sentCount++;
        return { status: 'fulfilled', tenant };
      } else {
        failedCount++;
        return { status: 'rejected', tenant, error: result.error };
      }
    });

    await Promise.allSettled(emailPromises);

    // Atualizar status para SENT
    return this.prisma.tenantMessage.update({
      where: { id },
      data: {
        status: TenantMessageStatus.SENT,
        sentAt: new Date(),
        sentCount,
        failedCount,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Buscar destinatários baseado no filtro
   */
  private async getRecipients(
    filter: MessageRecipientFilter,
    specificTenantIds: string[],
  ): Promise<Array<{ id: string; name: string; email: string }>> {
    switch (filter) {
      case MessageRecipientFilter.ALL_TENANTS:
        return this.prisma.tenant.findMany({
          select: { id: true, name: true, email: true },
        });

      case MessageRecipientFilter.ACTIVE_ONLY:
        return this.prisma.tenant.findMany({
          where: { status: TenantStatus.ACTIVE },
          select: { id: true, name: true, email: true },
        });

      case MessageRecipientFilter.TRIAL_ONLY:
        return this.prisma.tenant.findMany({
          where: { status: TenantStatus.TRIAL },
          select: { id: true, name: true, email: true },
        });

      case MessageRecipientFilter.OVERDUE_ONLY:
        // Tenants inadimplentes: buscar tenants com faturas vencidas
        const overdueInvoices = await this.prisma.invoice.findMany({
          where: {
            status: InvoiceStatus.OVERDUE,
          },
          select: {
            tenantId: true,
          },
          distinct: ['tenantId'],
        });

        const overdueTenantIds = overdueInvoices.map((inv) => inv.tenantId);

        return this.prisma.tenant.findMany({
          where: { id: { in: overdueTenantIds } },
          select: { id: true, name: true, email: true },
        });

      case MessageRecipientFilter.SPECIFIC_TENANTS:
        return this.prisma.tenant.findMany({
          where: { id: { in: specificTenantIds } },
          select: { id: true, name: true, email: true },
        });

      default:
        throw new BadRequestException('Filtro de destinatário inválido');
    }
  }
}
