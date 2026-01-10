import { Module } from '@nestjs/common';
import { SentinelEventsController } from './sentinel-events.controller';
import { SentinelEventsService } from './sentinel-events.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

/**
 * Módulo de Eventos Sentinela RDC 502/2021
 *
 * Responsável por:
 * - Detectar automaticamente eventos sentinela (quedas com lesão, tentativas de suicídio)
 * - Criar notificações críticas para o tenant
 * - Enviar alertas para Responsável Técnico
 * - Gerenciar protocolo de notificação à vigilância epidemiológica
 */
@Module({
  imports: [PrismaModule, PermissionsModule, NotificationsModule, EmailModule],
  controllers: [SentinelEventsController],
  providers: [SentinelEventsService],
  exports: [SentinelEventsService],
})
export class SentinelEventsModule {}
