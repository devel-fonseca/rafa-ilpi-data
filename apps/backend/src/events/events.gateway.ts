import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from './types/authenticated-socket.type';
import { WsAuthMiddleware } from './middleware/ws-auth.middleware';

/**
 * Gateway principal de WebSocket para eventos em tempo real
 *
 * FEATURES:
 * - Rooms por tenant para isolamento de dados
 * - Autenticação via JWT
 * - Reconexão automática (Socket.IO)
 * - Broadcast de eventos: alertas, atualizações, notificações
 *
 * ENDPOINTS:
 * - Namespace: /events
 * - CORS: Mesmas origens permitidas do REST API
 *
 * CASOS DE USO:
 * 1. Alertas de sinais vitais em tempo real
 * 2. Notificações de administração de medicamentos
 * 3. Atualizações de dashboard (pending activities)
 * 4. Locks de recursos concorrentes
 *
 * @see AuthenticatedSocket - Socket com dados do usuário
 * @see WsAuthMiddleware - Validação JWT no handshake
 */
@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly wsAuthMiddleware: WsAuthMiddleware) {}

  /**
   * Callback executado após inicialização do gateway
   * Configura middlewares de autenticação
   */
  afterInit(server: Server) {
    // Aplicar middleware de autenticação em todos os namespaces
    server.use((socket, next) => {
      this.wsAuthMiddleware.use(socket, next);
    });

    this.logger.log('[WS] EventsGateway initialized');
  }

  /**
   * Callback executado quando cliente conecta
   * Adiciona socket a rooms por tenant
   */
  handleConnection(@ConnectedSocket() socket: AuthenticatedSocket) {
    const { userId, tenantId, userName } = socket.data;

    // Adicionar socket ao room do tenant (isolamento multi-tenant)
    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
      this.logger.log(
        `[WS] User ${userName} (${userId}) connected to tenant:${tenantId}`,
      );
    } else {
      // SUPERADMIN: adicionar a room especial
      socket.join('tenant:superadmin');
      this.logger.log(`[WS] SUPERADMIN ${userName} connected`);
    }

    // Informar cliente que conexão foi estabelecida
    socket.emit('connection:success', {
      userId,
      tenantId,
      userName,
      message: 'WebSocket connected successfully',
    });
  }

  /**
   * Callback executado quando cliente desconecta
   */
  handleDisconnect(@ConnectedSocket() socket: AuthenticatedSocket) {
    const { userName, userId, tenantId } = socket.data;
    this.logger.log(
      `[WS] User ${userName} (${userId}) disconnected from tenant:${tenantId}`,
    );
  }

  /**
   * Broadcast de evento para todos os usuários de um tenant
   *
   * @param tenantId - ID do tenant
   * @param event - Nome do evento
   * @param data - Payload do evento
   */
  emitToTenant(tenantId: string, event: string, data: unknown) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
    this.logger.debug(`[WS] Emitted ${event} to tenant:${tenantId}`);
  }

  /**
   * Broadcast de evento para um usuário específico
   *
   * @param userId - ID do usuário
   * @param event - Nome do evento
   * @param data - Payload do evento
   */
  emitToUser(userId: string, event: string, data: unknown) {
    // Encontrar socket do usuário
    const sockets = Array.from(this.server.sockets.sockets.values());
    const userSocket = sockets.find(
      (s) => (s as AuthenticatedSocket).data?.userId === userId,
    );

    if (userSocket) {
      userSocket.emit(event, data);
      this.logger.debug(`[WS] Emitted ${event} to user:${userId}`);
    }
  }

  /**
   * Broadcast de alerta para tenant
   * Usado por: VitalSignsService, MedicationsService, etc.
   *
   * @example
   * this.eventsGateway.emitAlert({
   *   tenantId: '123',
   *   alert: { ... },
   *   resident: { ... }
   * });
   */
  emitAlert(data: {
    tenantId: string;
    alert: {
      id: string;
      type: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      message: string;
      residentId: string;
      requiresAck: boolean;
    };
    resident: {
      id: string;
      fullName: string;
      room?: string;
    };
  }) {
    this.emitToTenant(data.tenantId, 'alert:new', {
      id: data.alert.id,
      type: data.alert.type,
      severity: data.alert.severity,
      message: data.alert.message,
      resident: data.resident,
      timestamp: new Date().toISOString(),
      requiresAck: data.alert.requiresAck,
    });
  }

  /**
   * Broadcast de lock de medicamento (Sprint 2)
   * Usado quando um usuário bloqueia um medicamento para administração
   *
   * @example
   * this.eventsGateway.emitMedicationLock({
   *   tenantId: '123',
   *   medicationId: 'abc',
   *   scheduledDate: '2026-01-17',
   *   scheduledTime: '14:00',
   *   lockedBy: 'Dr. Emanuel',
   *   lockedByUserId: 'xyz',
   * });
   */
  emitMedicationLock(data: {
    tenantId: string;
    medicationId: string;
    scheduledDate: string;
    scheduledTime: string;
    lockedBy: string;
    lockedByUserId: string;
  }) {
    this.emitToTenant(data.tenantId, 'medication:locked', {
      medicationId: data.medicationId,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      lockedBy: data.lockedBy,
      lockedByUserId: data.lockedByUserId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast de unlock de medicamento (Sprint 2)
   * Usado quando um usuário desbloqueia um medicamento (fecha modal ou administra)
   */
  emitMedicationUnlock(data: {
    tenantId: string;
    medicationId: string;
    scheduledDate: string;
    scheduledTime: string;
    unlockedBy?: string;
  }) {
    this.emitToTenant(data.tenantId, 'medication:unlocked', {
      medicationId: data.medicationId,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      unlockedBy: data.unlockedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast de criação de registro diário (Sprint 3)
   * Usado quando um usuário cria qualquer tipo de registro diário
   * (alimentação, hidratação, peso, etc.)
   *
   * @example
   * this.eventsGateway.emitDailyRecordCreated({
   *   tenantId: '123',
   *   recordType: 'ALIMENTACAO',
   *   residentId: 'abc',
   *   residentName: 'João Silva',
   *   createdBy: 'Dr. Emanuel',
   *   createdByUserId: 'xyz',
   *   date: '2026-01-17',
   *   data: { ... },
   * });
   */
  emitDailyRecordCreated(data: {
    tenantId: string;
    recordType: string;
    residentId: string;
    residentName: string;
    createdBy: string;
    createdByUserId: string;
    date: string;
    data: Record<string, unknown>;
  }) {
    this.emitToTenant(data.tenantId, 'daily-record:created', {
      recordType: data.recordType,
      residentId: data.residentId,
      residentName: data.residentName,
      createdBy: data.createdBy,
      createdByUserId: data.createdByUserId,
      date: data.date,
      data: data.data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast de atualização do overview do dashboard administrativo.
   * Deve ser disparado quando entidades que alimentam pendências/histórico mudarem.
   */
  emitDashboardOverviewUpdated(data: {
    tenantId: string;
    source:
      | 'notification.created'
      | 'notification.read'
      | 'notification.unread'
      | 'notification.read-all'
      | 'notification.deleted'
      | 'prescription.created'
      | 'prescription.updated'
      | 'prescription.deleted'
      | 'resident.created'
      | 'resident.updated'
      | 'resident.deleted'
      | 'resident.bed-transferred'
      | 'bed.created'
      | 'bed.updated'
      | 'bed.deleted'
      | 'bed.status-changed'
      | 'building.created'
      | 'building.updated'
      | 'building.deleted'
      | 'building.structure-created'
      | 'floor.created'
      | 'floor.updated'
      | 'floor.deleted'
      | 'room.created'
      | 'room.updated'
      | 'room.deleted'
      | 'medication.administered'
      | 'medication.sos-administered'
      | 'medication.administration-updated'
      | 'medication.administration-deleted'
      | 'daily-record.created'
      | 'alert.created'
      | 'manual';
  }) {
    this.emitToTenant(data.tenantId, 'dashboard:overview-updated', {
      source: data.source,
      timestamp: new Date().toISOString(),
    });
  }
}
