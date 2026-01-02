-- ────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Add NotificationRead Table (Individual Read Tracking)
-- ────────────────────────────────────────────────────────────────────────────
-- OBJETIVO: Migrar de leitura global (Notification.read) para leitura individual
--           por usuário (NotificationRead junction table) sem perder dados.
--
-- PROBLEMA: Atualmente uma notificação broadcast é marcada como "lida" globalmente
--           quando um único usuário a lê, fazendo com que outros usuários vejam a
--           notificação como lida quando na verdade não a leram.
--
-- SOLUÇÃO: Criar tabela junction NotificationRead que rastreia individualmente
--          quais usuários leram quais notificações.
-- ────────────────────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 1: CREATE NEW NOTIFICATION_READS TABLE
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "notification_reads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notificationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "readAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id")
);

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 2: MIGRATE EXISTING READ DATA
-- ────────────────────────────────────────────────────────────────────────────
-- Para notificações NÃO-BROADCAST (userId NOT NULL) que foram lidas:
-- Criar registro em NotificationRead para esse usuário específico

INSERT INTO "notification_reads" ("id", "notificationId", "userId", "readAt")
SELECT
    gen_random_uuid() as "id",
    n.id as "notificationId",
    n."userId" as "userId",
    COALESCE(n."readAt", n."createdAt") as "readAt"
FROM "notifications" n
WHERE
    n."userId" IS NOT NULL  -- Notificação direcionada (não broadcast)
    AND n.read = true;      -- Foi marcada como lida

-- NOTA: Para notificações BROADCAST (userId IS NULL) que foram marcadas como lidas,
--       NÃO migramos dados porque não sabemos QUEM leu. Elas voltarão a aparecer
--       como não-lidas para todos os usuários. Isso é o comportamento correto.

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 3: ADD FOREIGN KEY CONSTRAINTS
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE "notification_reads"
ADD CONSTRAINT "notification_reads_notificationId_fkey"
FOREIGN KEY ("notificationId")
REFERENCES "notifications"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "notification_reads"
ADD CONSTRAINT "notification_reads_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 4: ADD UNIQUE CONSTRAINT
-- ────────────────────────────────────────────────────────────────────────────
-- Garante que um usuário só pode marcar uma notificação como lida uma vez

ALTER TABLE "notification_reads"
ADD CONSTRAINT "notification_reads_notificationId_userId_key"
UNIQUE ("notificationId", "userId");

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 5: CREATE INDEXES FOR PERFORMANCE
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX "notification_reads_userId_readAt_idx"
ON "notification_reads"("userId", "readAt" DESC);

CREATE INDEX "notification_reads_notificationId_idx"
ON "notification_reads"("notificationId");

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 6: DROP OLD COLUMNS FROM NOTIFICATIONS TABLE
-- ────────────────────────────────────────────────────────────────────────────
-- Remover campos antigos que não são mais necessários:
-- - userId: agora rastreado via NotificationRead
-- - read: agora rastreado via NotificationRead
-- - readAt: agora rastreado via NotificationRead

ALTER TABLE "notifications" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "read";
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "readAt";

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 7: DROP OLD INDEX (userId was removed)
-- ────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS "notifications_userId_idx";
DROP INDEX IF EXISTS "notifications_userId_read_createdAt_idx";

-- ────────────────────────────────────────────────────────────────────────────
-- MIGRATION COMPLETE
-- ────────────────────────────────────────────────────────────────────────────
-- RESULTADO: Notificações direcionadas (userId definido) que foram lidas
--            terão seus registros de leitura preservados.
--            Notificações broadcast voltarão como não-lidas (comportamento correto).
-- ────────────────────────────────────────────────────────────────────────────
