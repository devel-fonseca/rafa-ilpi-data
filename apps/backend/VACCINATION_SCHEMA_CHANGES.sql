-- ============================================================================
-- VACCINATION VERSIONING - Schema Changes
-- Padrão: Medication Versioning
-- ============================================================================

-- STEP 1: Adicionar campos de versionamento na tabela vaccinations
ALTER TABLE vaccinations
  ADD COLUMN version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN created_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ADD COLUMN updated_by UUID;

-- STEP 2: Atualizar created_by com valor de userId para registros existentes
UPDATE vaccinations SET created_by = user_id WHERE created_by = '00000000-0000-0000-0000-000000000000';

-- STEP 3: Adicionar Foreign Keys
ALTER TABLE vaccinations
  ADD CONSTRAINT vaccinations_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT vaccinations_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- STEP 4: Criar índices
CREATE INDEX vaccinations_created_by_idx ON vaccinations(created_by);
CREATE INDEX vaccinations_updated_by_idx ON vaccinations(updated_by);

-- STEP 5: Criar tabela vaccination_history
CREATE TABLE vaccination_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  vaccination_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  change_type "ChangeType" NOT NULL,
  change_reason TEXT NOT NULL,

  -- Snapshots (JSON)
  previous_data JSONB,
  new_data JSONB NOT NULL,

  -- Campos alterados
  changed_fields TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Auditoria detalhada
  changed_at TIMESTAMPTZ(3) NOT NULL,
  changed_by UUID NOT NULL,
  changed_by_name VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Metadados
  metadata JSONB,

  -- Foreign Keys
  CONSTRAINT vaccination_history_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT vaccination_history_vaccination_id_fkey
    FOREIGN KEY (vaccination_id) REFERENCES vaccinations(id) ON DELETE CASCADE,
  CONSTRAINT vaccination_history_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- STEP 6: Criar índices para vaccination_history
CREATE INDEX vaccination_history_tenant_vaccination_version_idx
  ON vaccination_history(tenant_id, vaccination_id, version_number DESC);
CREATE INDEX vaccination_history_tenant_changed_at_idx
  ON vaccination_history(tenant_id, changed_at DESC);
CREATE INDEX vaccination_history_changed_by_idx
  ON vaccination_history(changed_by);
CREATE INDEX vaccination_history_change_type_idx
  ON vaccination_history(change_type);

-- STEP 7: Adicionar relation ao tenant
-- (Será feito no Prisma schema)
