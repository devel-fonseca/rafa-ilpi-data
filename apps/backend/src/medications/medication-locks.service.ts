import { Injectable, Logger, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { TenantContextService } from '../prisma/tenant-context.service';
import { EventsGateway } from '../events/events.gateway';
import { parseISO, addMinutes } from 'date-fns';

/**
 * Sprint 2 - WebSocket: Service para gerenciar locks de medicamentos
 *
 * OBJETIVO: Prevenir administração duplicada de medicamentos através de locking em tempo real
 *
 * FEATURES:
 * - Lock automático ao abrir modal de administração
 * - Auto-expiração após 5 minutos (caso usuário esqueça modal aberto)
 * - Broadcast via WebSocket quando lock/unlock ocorre
 * - Validação de locks existentes antes de administrar
 *
 * CASOS DE USO:
 * 1. Usuário A abre modal → lock criado → broadcast
 * 2. Usuário B tenta abrir modal → verifica lock → exibe alerta "Medicamento bloqueado por Usuário A"
 * 3. Usuário A fecha modal → unlock → broadcast
 * 4. Usuário A administra medicamento → unlock automático → broadcast
 * 5. Usuário A esquece modal aberto → lock expira após 5 minutos → cleanup automático
 */

interface LockMedicationDto {
  medicationId: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  sessionId?: string;
  ipAddress?: string;
}

interface UnlockMedicationDto {
  medicationId: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
}

@Injectable()
export class MedicationLocksService {
  private readonly logger = new Logger(MedicationLocksService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Cria um lock para um medicamento específico em um horário agendado
   * Lança ConflictException se já existir lock ativo
   */
  async lockMedication(
    dto: LockMedicationDto,
    userId: string,
    userName: string,
  ) {
    const { medicationId, scheduledDate, scheduledTime, sessionId, ipAddress } =
      dto;

    // Verificar se já existe lock ativo (não expirado)
    const existingLock = await this.tenantContext.client.medicationLock.findFirst({
      where: {
        medicationId,
        scheduledDate: parseISO(`${scheduledDate}T12:00:00.000`),
        scheduledTime,
        expiresAt: {
          gt: new Date(), // Lock ainda ativo (não expirou)
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (existingLock) {
      this.logger.warn('Tentativa de lock em medicamento já bloqueado', {
        medicationId,
        scheduledDate,
        scheduledTime,
        existingLockedBy: existingLock.lockedByUserName,
        attemptedBy: userName,
      });

      throw new ConflictException(
        `Medicamento já está sendo administrado por ${existingLock.lockedByUserName}`,
      );
    }

    // Criar lock com expiração em 5 minutos
    const expiresAt = addMinutes(new Date(), 5);

    const lock = await this.tenantContext.client.medicationLock.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        medicationId,
        scheduledDate: parseISO(`${scheduledDate}T12:00:00.000`),
        scheduledTime,
        lockedByUserId: userId,
        lockedByUserName: userName,
        expiresAt,
        sessionId,
        ipAddress,
      },
    });

    this.logger.log('Medicamento bloqueado com sucesso', {
      lockId: lock.id,
      medicationId,
      scheduledDate,
      scheduledTime,
      lockedBy: userName,
      expiresAt,
    });

    // Broadcast lock via WebSocket para todos os usuários do tenant
    this.eventsGateway.emitMedicationLock({
      tenantId: this.tenantContext.tenantId,
      medicationId,
      scheduledDate,
      scheduledTime,
      lockedBy: userName,
      lockedByUserId: userId,
    });

    return lock;
  }

  /**
   * Remove um lock de medicamento (ao fechar modal ou após administração)
   * Retorna null se lock não existir (já expirou ou não existe)
   */
  async unlockMedication(dto: UnlockMedicationDto, userId: string) {
    const { medicationId, scheduledDate, scheduledTime } = dto;

    // Deletar lock (apenas se for do usuário atual)
    const deleted = await this.tenantContext.client.medicationLock.deleteMany({
      where: {
        medicationId,
        scheduledDate: parseISO(`${scheduledDate}T12:00:00.000`),
        scheduledTime,
        lockedByUserId: userId, // Só pode desbloquear seu próprio lock
      },
    });

    if (deleted.count === 0) {
      this.logger.warn('Lock não encontrado ou não pertence ao usuário', {
        medicationId,
        scheduledDate,
        scheduledTime,
        userId,
      });
      return null;
    }

    this.logger.log('Medicamento desbloqueado com sucesso', {
      medicationId,
      scheduledDate,
      scheduledTime,
      unlockedBy: userId,
    });

    // Broadcast unlock via WebSocket para todos os usuários do tenant
    this.eventsGateway.emitMedicationUnlock({
      tenantId: this.tenantContext.tenantId,
      medicationId,
      scheduledDate,
      scheduledTime,
      unlockedBy: userId,
    });

    return { success: true };
  }

  /**
   * Verifica se um medicamento está bloqueado
   * Retorna informações do lock se ativo, null caso contrário
   */
  async checkLock(
    medicationId: string,
    scheduledDate: string,
    scheduledTime: string,
  ) {
    const lock = await this.tenantContext.client.medicationLock.findFirst({
      where: {
        medicationId,
        scheduledDate: parseISO(`${scheduledDate}T12:00:00.000`),
        scheduledTime,
        expiresAt: {
          gt: new Date(), // Lock ainda ativo
        },
      },
    });

    return lock;
  }

  /**
   * Cleanup de locks expirados (executado periodicamente via cron)
   * Remove locks que expiraram há mais de 1 hora
   */
  async cleanupExpiredLocks() {
    const oneHourAgo = addMinutes(new Date(), -60);

    const deleted = await this.tenantContext.client.medicationLock.deleteMany({
      where: {
        expiresAt: {
          lt: oneHourAgo,
        },
      },
    });

    if (deleted.count > 0) {
      this.logger.log(`Limpeza de locks expirados: ${deleted.count} removidos`);
    }

    return deleted.count;
  }

  /**
   * Verifica e remove lock de um medicamento ao administrá-lo
   * Deve ser chamado APÓS a criação do MedicationAdministration
   */
  async unlockAfterAdministration(
    medicationId: string,
    scheduledDate: string,
    scheduledTime: string,
    userId: string,
  ) {
    return this.unlockMedication(
      {
        medicationId,
        scheduledDate,
        scheduledTime,
      },
      userId,
    );
  }
}
