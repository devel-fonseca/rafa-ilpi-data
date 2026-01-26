-- CreateTable: terms_of_service (Nova tabela de Termos de Uso SaaS)
CREATE TABLE "terms_of_service" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" VARCHAR(50) NOT NULL,
    "planId" UUID,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "effective_from" TIMESTAMPTZ(3),
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "created_by" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_by" UUID,

    CONSTRAINT "terms_of_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable: terms_of_service_acceptances (Registros de Aceite dos Termos de Uso)
CREATE TABLE "terms_of_service_acceptances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "terms_id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accepted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT NOT NULL,
    "terms_version" VARCHAR(50) NOT NULL,
    "terms_hash" VARCHAR(64) NOT NULL,
    "terms_content" TEXT NOT NULL,

    CONSTRAINT "terms_of_service_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "terms_of_service_version_planId_key" ON "terms_of_service"("version", "planId");

-- CreateIndex
CREATE INDEX "terms_of_service_status_idx" ON "terms_of_service"("status");

-- CreateIndex
CREATE INDEX "terms_of_service_effective_from_idx" ON "terms_of_service"("effective_from");

-- CreateIndex
CREATE INDEX "terms_of_service_planId_idx" ON "terms_of_service"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "terms_of_service_acceptances_tenantId_key" ON "terms_of_service_acceptances"("tenantId");

-- CreateIndex
CREATE INDEX "terms_of_service_acceptances_terms_id_idx" ON "terms_of_service_acceptances"("terms_id");

-- CreateIndex
CREATE INDEX "terms_of_service_acceptances_accepted_at_idx" ON "terms_of_service_acceptances"("accepted_at");

-- AddForeignKey
ALTER TABLE "terms_of_service" ADD CONSTRAINT "terms_of_service_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_of_service" ADD CONSTRAINT "terms_of_service_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_of_service" ADD CONSTRAINT "terms_of_service_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_of_service_acceptances" ADD CONSTRAINT "terms_of_service_acceptances_terms_id_fkey" FOREIGN KEY ("terms_id") REFERENCES "terms_of_service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_of_service_acceptances" ADD CONSTRAINT "terms_of_service_acceptances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comment: Esta migration cria as novas tabelas terms_of_service e terms_of_service_acceptances
-- As tabelas antigas service_contracts e contract_acceptances serão mantidas temporariamente
-- para permitir migração de dados e rollback seguro
