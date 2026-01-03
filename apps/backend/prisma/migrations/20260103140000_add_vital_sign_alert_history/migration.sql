-- Migration: Adicionar tabela de histórico de alertas de sinais vitais
-- Objetivo: Rastrear todas as alterações nos alertas médicos para exibição ao usuário

-- AlterTable: Remover default do ID de notification_reads (ajuste automático do Prisma)
ALTER TABLE "notification_reads" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable: Histórico de alterações de alertas de sinais vitais
CREATE TABLE "vital_sign_alert_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "alert_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "assigned_to" UUID,
    "medical_notes" TEXT,
    "action_taken" TEXT,
    "changed_by" UUID NOT NULL,
    "change_reason" TEXT,
    "change_type" VARCHAR(50) NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_sign_alert_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Índice composto para buscar histórico de um alerta em ordem cronológica
CREATE INDEX "vital_sign_alert_history_alert_id_changed_at_idx" ON "vital_sign_alert_history"("alert_id", "changed_at" DESC);

-- CreateIndex: Índice para buscar alterações por usuário
CREATE INDEX "vital_sign_alert_history_changed_by_idx" ON "vital_sign_alert_history"("changed_by");

-- CreateIndex: Índices de performance para notificações (ajustes automáticos)
CREATE INDEX "notifications_tenantId_createdAt_idx" ON "notifications"("tenantId", "createdAt" DESC);
CREATE INDEX "notifications_tenantId_category_createdAt_idx" ON "notifications"("tenantId", "category", "createdAt" DESC);
CREATE INDEX "notifications_tenantId_severity_createdAt_idx" ON "notifications"("tenantId", "severity", "createdAt" DESC);
CREATE INDEX "notifications_tenantId_type_idx" ON "notifications"("tenantId", "type");

-- AddForeignKey: Relação com alerta (CASCADE ao deletar alerta)
ALTER TABLE "vital_sign_alert_history" ADD CONSTRAINT "vital_sign_alert_history_alert_id_fkey"
    FOREIGN KEY ("alert_id") REFERENCES "vital_sign_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Relação com usuário que fez a alteração (SET NULL se usuário for deletado)
ALTER TABLE "vital_sign_alert_history" ADD CONSTRAINT "vital_sign_alert_history_changed_by_fkey"
    FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Relação com usuário atribuído (SET NULL se usuário for deletado)
ALTER TABLE "vital_sign_alert_history" ADD CONSTRAINT "vital_sign_alert_history_assigned_to_fkey"
    FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
