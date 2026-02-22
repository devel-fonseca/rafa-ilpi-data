-- RDC 502/2021 - revisão explícita dos indicadores mensais
-- 1) Novas colunas de controle no agregado mensal
ALTER TABLE "incident_monthly_indicators"
  ADD COLUMN "provisionalNumerator" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalCandidates" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "pendingCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "confirmedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "discardedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "populationReferenceDate" DATE,
  ADD COLUMN "periodStatus" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "periodClosedAt" TIMESTAMPTZ(3),
  ADD COLUMN "periodClosedBy" VARCHAR(100),
  ADD COLUMN "periodClosedByName" VARCHAR(255),
  ADD COLUMN "periodCloseNote" TEXT;

-- 2) Tabela de decisões por caso (confirmação/descarte)
CREATE TABLE "incident_monthly_indicator_reviews" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "indicatorId" UUID NOT NULL,
  "incidentId" UUID NOT NULL,
  "decision" VARCHAR(20) NOT NULL,
  "reason" TEXT,
  "decidedAt" TIMESTAMPTZ(3) NOT NULL,
  "decidedBy" VARCHAR(100),
  "decidedByName" VARCHAR(255),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "incident_monthly_indicator_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "incident_monthly_indicator_reviews_indicatorId_fkey"
    FOREIGN KEY ("indicatorId")
    REFERENCES "incident_monthly_indicators"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "incident_monthly_indicator_reviews_indicatorId_incidentId_key"
  ON "incident_monthly_indicator_reviews"("indicatorId", "incidentId");
CREATE INDEX "incident_monthly_indicator_reviews_tenantId_indicatorId_idx"
  ON "incident_monthly_indicator_reviews"("tenantId", "indicatorId");
CREATE INDEX "incident_monthly_indicator_reviews_tenantId_incidentId_idx"
  ON "incident_monthly_indicator_reviews"("tenantId", "incidentId");
CREATE INDEX "incident_monthly_indicator_reviews_tenantId_decision_idx"
  ON "incident_monthly_indicator_reviews"("tenantId", "decision");

-- 3) Índices de consulta mensal/fechamento
CREATE INDEX "incident_monthly_indicators_tenantId_year_month_periodStatus_idx"
  ON "incident_monthly_indicators"("tenantId", "year" DESC, "month" DESC, "periodStatus");
CREATE INDEX "incident_monthly_indicators_tenantId_periodStatus_idx"
  ON "incident_monthly_indicators"("tenantId", "periodStatus");

-- 4) Backfill inicial das novas colunas
UPDATE "incident_monthly_indicators" imi
SET
  "provisionalNumerator" = COALESCE(imi."numerator", 0),
  "totalCandidates" = COALESCE(jsonb_array_length(COALESCE(imi."incidentIds", '[]'::jsonb)), 0),
  "populationReferenceDate" = COALESCE(
    NULLIF(split_part(COALESCE(imi."metadata"->>'populationReferenceDate', ''), 'T', 1), '')::date,
    make_date(imi."year", imi."month", 15)
  ),
  "periodStatus" = CASE
    WHEN UPPER(COALESCE(imi."metadata"->'periodClosure'->>'status', '')) = 'CLOSED'
      OR NULLIF(COALESCE(imi."metadata"->'periodClosure'->>'closedAt', ''), '') IS NOT NULL
      THEN 'CLOSED'
    ELSE 'OPEN'
  END,
  "periodClosedAt" = NULLIF(COALESCE(imi."metadata"->'periodClosure'->>'closedAt', ''), '')::timestamptz,
  "periodClosedBy" = NULLIF(COALESCE(imi."metadata"->'periodClosure'->>'closedBy', ''), ''),
  "periodClosedByName" = NULLIF(COALESCE(imi."metadata"->'periodClosure'->>'closedByName', ''), ''),
  "periodCloseNote" = NULLIF(COALESCE(imi."metadata"->'periodClosure'->>'note', ''), '');

-- 5) Backfill da tabela de revisão com decisões antigas gravadas em metadata.caseDecisions
INSERT INTO "incident_monthly_indicator_reviews" (
  "id",
  "tenantId",
  "indicatorId",
  "incidentId",
  "decision",
  "reason",
  "decidedAt",
  "decidedBy",
  "decidedByName",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  imi."tenantId",
  imi."id",
  decision_entry."incidentId"::uuid,
  UPPER(decision_entry."decision"),
  NULLIF(BTRIM(decision_entry."reason"), ''),
  COALESCE(decision_entry."reviewedAt", imi."calculatedAt"),
  NULLIF(BTRIM(decision_entry."reviewedBy"), ''),
  NULLIF(BTRIM(decision_entry."reviewedByName"), ''),
  NOW(),
  NOW()
FROM "incident_monthly_indicators" imi
CROSS JOIN LATERAL (
  SELECT
    kv.key AS "incidentId",
    COALESCE(kv.value->>'decision', '') AS "decision",
    kv.value->>'reason' AS "reason",
    NULLIF(kv.value->>'reviewedBy', '') AS "reviewedBy",
    NULLIF(kv.value->>'reviewedByName', '') AS "reviewedByName",
    NULLIF(kv.value->>'reviewedAt', '')::timestamptz AS "reviewedAt"
  FROM jsonb_each(COALESCE(imi."metadata"->'caseDecisions', '{}'::jsonb)) kv
) decision_entry
WHERE decision_entry."incidentId" ~* '^[0-9a-fA-F-]{36}$'
  AND UPPER(decision_entry."decision") IN ('CONFIRMED', 'DISCARDED')
ON CONFLICT ("indicatorId", "incidentId")
DO UPDATE
SET
  "decision" = EXCLUDED."decision",
  "reason" = EXCLUDED."reason",
  "decidedAt" = EXCLUDED."decidedAt",
  "decidedBy" = EXCLUDED."decidedBy",
  "decidedByName" = EXCLUDED."decidedByName",
  "updatedAt" = NOW();

-- 6) Recalcular contadores explícitos com base na tabela de revisão
UPDATE "incident_monthly_indicators" imi
SET
  "confirmedCount" = COALESCE(reviewCounts."confirmedCount", 0),
  "discardedCount" = COALESCE(reviewCounts."discardedCount", 0),
  "pendingCount" = GREATEST(
    COALESCE(imi."totalCandidates", 0)
      - COALESCE(reviewCounts."confirmedCount", 0)
      - COALESCE(reviewCounts."discardedCount", 0),
    0
  )
FROM (
  SELECT
    r."indicatorId",
    COUNT(*) FILTER (WHERE UPPER(r."decision") = 'CONFIRMED') AS "confirmedCount",
    COUNT(*) FILTER (WHERE UPPER(r."decision") = 'DISCARDED') AS "discardedCount"
  FROM "incident_monthly_indicator_reviews" r
  GROUP BY r."indicatorId"
) reviewCounts
WHERE imi."id" = reviewCounts."indicatorId";
