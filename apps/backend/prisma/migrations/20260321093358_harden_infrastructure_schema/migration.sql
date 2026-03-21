-- Normalize legacy bed statuses before hardening constraints
UPDATE "beds"
SET "status" = CASE
  WHEN "status" IN ('DISPONIVEL', 'DISPONÍVEL') THEN 'Disponível'
  WHEN "status" = 'OCUPADO' THEN 'Ocupado'
  WHEN "status" IN ('MANUTENCAO', 'MANUTENÇÃO') THEN 'Manutenção'
  WHEN "status" = 'RESERVADO' THEN 'Reservado'
  ELSE "status"
END;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "buildings"
    WHERE "deletedAt" IS NULL
    GROUP BY "tenantId", "code"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce active unique building codes: duplicate buildings.code values found for the same tenant';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "buildings_tenantId_code_active_key"
  ON "buildings" ("tenantId", "code")
  WHERE "deletedAt" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "floors"
    WHERE "deletedAt" IS NULL
    GROUP BY "tenantId", "buildingId", "code"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce active unique floor codes: duplicate floors.code values found for the same building';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "floors_tenantId_buildingId_code_active_key"
  ON "floors" ("tenantId", "buildingId", "code")
  WHERE "deletedAt" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "rooms"
    WHERE "deletedAt" IS NULL
    GROUP BY "tenantId", "floorId", "code"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce active unique room codes: duplicate rooms.code values found for the same floor';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "rooms_tenantId_floorId_code_active_key"
  ON "rooms" ("tenantId", "floorId", "code")
  WHERE "deletedAt" IS NULL;

ALTER TABLE "beds"
  DROP CONSTRAINT IF EXISTS "beds_status_allowed_check";

ALTER TABLE "beds"
  ADD CONSTRAINT "beds_status_allowed_check"
  CHECK ("status" IN ('Disponível', 'Ocupado', 'Manutenção', 'Reservado'));
