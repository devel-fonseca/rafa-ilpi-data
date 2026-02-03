-- RemoveLegacyBelongingsField
-- Remove o campo JSON legado belongings da tabela residents
-- Este campo foi substituído pelo módulo ResidentBelongings com tabelas próprias

-- Remove a coluna belongings da tabela residents
ALTER TABLE "residents" DROP COLUMN IF EXISTS "belongings";
