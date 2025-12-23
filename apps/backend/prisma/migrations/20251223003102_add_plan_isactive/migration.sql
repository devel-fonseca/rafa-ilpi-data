-- AlterTable
ALTER TABLE "plans" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Comentário: Todos os planos existentes serão marcados como ativos por padrão
