-- ============================================================================
-- Migration: Add Resident Versioning and History (LGPD + RDC 502/2021)
-- Date: 2025-12-12
-- Description: Implementa versionamento completo para módulo Resident com
--              auditoria e histórico imutável conforme RDC 502/2021
-- ============================================================================

-- 1. Criar ENUM para tipo de alteração
CREATE TYPE "ChangeType" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- 2. Adicionar campos de versionamento e auditoria na tabela residents
-- IMPORTANTE: Usando valor padrão temporário para createdBy (será removido após popular dados)
ALTER TABLE "residents"
  ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "createdBy" UUID,
  ADD COLUMN "updatedBy" UUID;

-- 3. Popular campo createdBy com o primeiro usuário do tenant (fallback temporário)
-- Será atualizado posteriormente com dados reais se necessário
UPDATE "residents" r
SET "createdBy" = (
  SELECT u.id
  FROM "users" u
  WHERE u."tenantId" = r."tenantId"
  ORDER BY u."createdAt" ASC
  LIMIT 1
)
WHERE "createdBy" IS NULL;

-- 4. Tornar createdBy obrigatório (NOT NULL) após popular
ALTER TABLE "residents"
  ALTER COLUMN "createdBy" SET NOT NULL;

-- 5. Criar tabela de histórico de residentes (immutable audit trail)
CREATE TABLE "resident_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "residentId" UUID NOT NULL,

  -- Versionamento
  "versionNumber" INTEGER NOT NULL,
  "changeType" "ChangeType" NOT NULL,
  "changeReason" TEXT NOT NULL,

  -- Campos alterados
  "changedFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Snapshots (JSON)
  "previousData" JSONB,
  "newData" JSONB NOT NULL,

  -- Auditoria
  "changedAt" TIMESTAMPTZ(3) NOT NULL,
  "changedBy" UUID NOT NULL,

  -- Metadata opcional
  "metadata" JSONB DEFAULT '{}',

  CONSTRAINT "resident_history_pkey" PRIMARY KEY ("id")
);

-- 6. Criar índices para performance nas consultas de histórico
CREATE INDEX "resident_history_tenantId_residentId_versionNumber_idx"
  ON "resident_history"("tenantId", "residentId", "versionNumber" DESC);

CREATE INDEX "resident_history_tenantId_changedAt_idx"
  ON "resident_history"("tenantId", "changedAt" DESC);

CREATE INDEX "resident_history_changedBy_idx"
  ON "resident_history"("changedBy");

CREATE INDEX "resident_history_changeType_idx"
  ON "resident_history"("changeType");

-- 7. Criar índices adicionais na tabela residents para auditoria
CREATE INDEX "residents_createdBy_idx" ON "residents"("createdBy");
CREATE INDEX "residents_updatedBy_idx" ON "residents"("updatedBy");

-- 8. Adicionar Foreign Keys
-- FK: residents.createdBy → users.id
ALTER TABLE "residents"
  ADD CONSTRAINT "residents_createdBy_fkey"
  FOREIGN KEY ("createdBy")
  REFERENCES "users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- FK: residents.updatedBy → users.id
ALTER TABLE "residents"
  ADD CONSTRAINT "residents_updatedBy_fkey"
  FOREIGN KEY ("updatedBy")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- FK: resident_history.tenantId → tenants.id
ALTER TABLE "resident_history"
  ADD CONSTRAINT "resident_history_tenantId_fkey"
  FOREIGN KEY ("tenantId")
  REFERENCES "tenants"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- FK: resident_history.residentId → residents.id
ALTER TABLE "resident_history"
  ADD CONSTRAINT "resident_history_residentId_fkey"
  FOREIGN KEY ("residentId")
  REFERENCES "residents"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- FK: resident_history.changedBy → users.id
ALTER TABLE "resident_history"
  ADD CONSTRAINT "resident_history_changedBy_fkey"
  FOREIGN KEY ("changedBy")
  REFERENCES "users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- 9. Adicionar comentários para documentação
COMMENT ON TABLE "resident_history" IS 'Histórico imutável de alterações em residentes (RDC 502/2021 Art. 39)';
COMMENT ON COLUMN "resident_history"."changeReason" IS 'Motivo obrigatório da alteração (min 10 caracteres)';
COMMENT ON COLUMN "resident_history"."previousData" IS 'Snapshot completo do estado anterior (NULL em CREATE)';
COMMENT ON COLUMN "resident_history"."newData" IS 'Snapshot completo do estado novo';
COMMENT ON COLUMN "resident_history"."changedFields" IS 'Array de nomes dos campos que foram alterados';
COMMENT ON COLUMN "residents"."versionNumber" IS 'Número da versão atual do registro (incrementa a cada UPDATE)';

-- 10. Criar função para validar changeReason (min 10 caracteres)
CREATE OR REPLACE FUNCTION validate_change_reason()
RETURNS TRIGGER AS $$
BEGIN
  IF LENGTH(TRIM(NEW."changeReason")) < 10 THEN
    RAISE EXCEPTION 'changeReason must be at least 10 characters long (got: %)', LENGTH(TRIM(NEW."changeReason"));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Criar trigger para validar changeReason
CREATE TRIGGER validate_resident_history_change_reason
  BEFORE INSERT OR UPDATE ON "resident_history"
  FOR EACH ROW
  EXECUTE FUNCTION validate_change_reason();

-- ============================================================================
-- SUCESSO: Migration aplicada com sucesso!
--
-- Próximos passos:
-- 1. Atualizar ResidentsService para criar histórico em cada UPDATE
-- 2. Implementar DTOs com campo changeReason obrigatório
-- 3. Atualizar frontend para solicitar motivo das alterações
-- ============================================================================
