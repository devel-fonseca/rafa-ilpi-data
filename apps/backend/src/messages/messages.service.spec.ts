import { Test, TestingModule } from '@nestjs/testing'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import { MessageType, MessageStatus, PermissionType } from '@prisma/client'
import { BadRequestException } from '@nestjs/common'
import { MessagesService } from './messages.service'
import { PrismaService } from '../prisma/prisma.service'
import { TenantContextService } from '../prisma/tenant-context.service'
import { PermissionsService } from '../permissions/permissions.service'

describe('MessagesService', () => {
  let service: MessagesService
  let tenantClient: {
    user: { findMany: jest.Mock }
    message: { findFirst: jest.Mock }
    $transaction: jest.Mock
  }
  let permissionsService: { hasPermission: jest.Mock }
  let transactionClient: {
    message: { create: jest.Mock }
    messageRecipient: { createMany: jest.Mock }
  }

  beforeEach(async () => {
    transactionClient = {
      message: {
        create: jest.fn(),
      },
      messageRecipient: {
        createMany: jest.fn(),
      },
    }

    tenantClient = {
      user: {
        findMany: jest.fn(),
      },
      message: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => callback(transactionClient)),
    }

    permissionsService = {
      hasPermission: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: TenantContextService,
          useValue: {
            tenantId: 'tenant-test-id',
            client: tenantClient,
          },
        },
        {
          provide: PermissionsService,
          useValue: permissionsService,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get(MessagesService)
  })

  it('should validate direct recipients in a single query and create the message', async () => {
    tenantClient.user.findMany.mockResolvedValue([{ id: 'user-2' }, { id: 'user-3' }])
    transactionClient.message.create.mockResolvedValue({
      id: 'message-1',
      sender: {
        id: 'user-1',
        name: 'Admin',
        email: 'admin@example.com',
        profile: { profilePhoto: null },
      },
    })

    const result = await service.create(
      {
        type: MessageType.DIRECT,
        subject: 'Aviso interno',
        body: 'Mensagem de teste com destinatarios validos.',
        recipientIds: ['user-2', 'user-3', 'user-2'],
      },
      'user-1',
    )

    expect(tenantClient.user.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['user-2', 'user-3'] },
        deletedAt: null,
      },
      select: { id: true },
    })
    expect(transactionClient.messageRecipient.createMany).toHaveBeenCalledWith({
      data: [
        {
          messageId: 'message-1',
          userId: 'user-2',
          tenantId: 'tenant-test-id',
          status: MessageStatus.SENT,
        },
        {
          messageId: 'message-1',
          userId: 'user-3',
          tenantId: 'tenant-test-id',
          status: MessageStatus.SENT,
        },
        {
          messageId: 'message-1',
          userId: 'user-2',
          tenantId: 'tenant-test-id',
          status: MessageStatus.SENT,
        },
      ],
    })
    expect(result.id).toBe('message-1')
  })

  it('should fail fast when a direct recipient does not exist', async () => {
    tenantClient.user.findMany.mockResolvedValue([{ id: 'user-2' }])

    await expect(
      service.create(
        {
          type: MessageType.DIRECT,
          subject: 'Aviso interno',
          body: 'Mensagem de teste com destinatario ausente.',
          recipientIds: ['user-2', 'user-404'],
        },
        'user-1',
      ),
    ).rejects.toThrow(
      new BadRequestException('Destinatário user-404 não encontrado ou não pertence ao tenant'),
    )

    expect(tenantClient.$transaction).not.toHaveBeenCalled()
  })

  it('should not revalidate recipients individually for broadcast messages', async () => {
    permissionsService.hasPermission.mockResolvedValue(true)
    tenantClient.user.findMany.mockResolvedValue([{ id: 'user-2' }, { id: 'user-3' }])
    transactionClient.message.create.mockResolvedValue({
      id: 'message-2',
      sender: {
        id: 'user-1',
        name: 'Admin',
        email: 'admin@example.com',
        profile: { profilePhoto: null },
      },
    })

    await service.create(
      {
        type: MessageType.BROADCAST,
        subject: 'Comunicado geral',
        body: 'Mensagem broadcast de teste para todos os usuarios ativos.',
      },
      'user-1',
    )

    expect(permissionsService.hasPermission).toHaveBeenCalledWith(
      'user-1',
      PermissionType.BROADCAST_MESSAGES,
    )
    expect(tenantClient.user.findMany).toHaveBeenCalledTimes(1)
    expect(tenantClient.user.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        deletedAt: null,
        id: { not: 'user-1' },
      },
      select: { id: true },
    })
  })
})
