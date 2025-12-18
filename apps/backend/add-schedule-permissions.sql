-- Script para adicionar permissão VIEW_RESIDENT_SCHEDULE a cuidadores existentes
-- Execute este script manualmente no banco de dados

-- Adicionar VIEW_RESIDENT_SCHEDULE para todos os usuários que já têm VIEW_DAILY_RECORDS
-- (isso identifica cuidadores e equipe de enfermagem)

UPDATE "UserProfile"
SET "customPermissions" = array_append("customPermissions", 'VIEW_RESIDENT_SCHEDULE')
WHERE
  'VIEW_DAILY_RECORDS' = ANY("customPermissions")
  AND NOT ('VIEW_RESIDENT_SCHEDULE' = ANY("customPermissions"));

-- Verificar quantos usuários foram atualizados
SELECT
  u."fullName",
  u."email",
  up."positionCode",
  up."customPermissions"
FROM "UserProfile" up
JOIN "User" u ON u."id" = up."userId"
WHERE 'VIEW_RESIDENT_SCHEDULE' = ANY(up."customPermissions")
ORDER BY u."fullName";
