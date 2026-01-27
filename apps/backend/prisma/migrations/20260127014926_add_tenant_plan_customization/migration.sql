-- AlterTable: Adicionar campos de customização de plano ao Tenant
-- Estes campos permitem sobrescrever limites do plano base para casos especiais:
-- - Retenção de clientes (evitar cancelamento)
-- - Testes e validações
-- - Negociações comerciais
ALTER TABLE "tenants" ADD COLUMN "customMaxUsers" INTEGER;
ALTER TABLE "tenants" ADD COLUMN "customMaxResidents" INTEGER;
ALTER TABLE "tenants" ADD COLUMN "customFeatures" JSONB;

-- Comentários para documentação
COMMENT ON COLUMN "tenants"."customMaxUsers" IS 'Override de maxUsers do plano. null = usa plano base | número = limite customizado';
COMMENT ON COLUMN "tenants"."customMaxResidents" IS 'Override de maxResidents do plano. null = usa plano base | número = limite customizado';
COMMENT ON COLUMN "tenants"."customFeatures" IS 'Override/merge de features do plano. null = usa plano base | objeto JSON = merge com features do plano. Exemplo: {"evolucoes_clinicas": true, "agenda": false}';
