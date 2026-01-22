-- DropForeignKey: ContractAcceptance.userId → User.id (cross-schema)
-- DropForeignKey: PrivacyPolicyAcceptance.userId → User.id (cross-schema)

-- Step 1: Drop FK constraint na tabela contract_acceptances
ALTER TABLE "public"."contract_acceptances"
  DROP CONSTRAINT IF EXISTS "contract_acceptances_userId_fkey";

-- Step 2: Drop FK constraint na tabela privacy_policy_acceptances
ALTER TABLE "public"."privacy_policy_acceptances"
  DROP CONSTRAINT IF EXISTS "privacy_policy_acceptances_userId_fkey";

-- Observação: userId continua existindo como campo de referência (String @db.Uuid)
-- mas SEM foreign key constraint, respeitando a arquitetura multi-tenant schema isolation
