-- Script para adicionar permissão CREATE_CLINICAL_PROFILE aos usuários RT e ADMIN
-- Executar com: PGPASSWORD=rafa_pass_dev psql -h localhost -p 5433 -U rafa_user -d rafa_ilpi -f add-create-clinical-profile-permission.sql

-- Adicionar permissão aos usuários com cargo TECHNICAL_MANAGER
INSERT INTO user_permissions (id, "userProfileId", "tenantId", permission, "isGranted", "grantedBy", "grantedAt", "updatedAt")
SELECT
  gen_random_uuid(),
  up.id,
  up."tenantId",
  'CREATE_CLINICAL_PROFILE'::"PermissionType",
  true,
  u.id, -- granted by the user themselves (sistema)
  NOW(),
  NOW()
FROM users u
INNER JOIN user_profiles up ON up."userId" = u.id
WHERE up."positionCode" = 'TECHNICAL_MANAGER'
  AND NOT EXISTS (
    SELECT 1
    FROM user_permissions upe
    WHERE upe."userProfileId" = up.id
      AND upe.permission = 'CREATE_CLINICAL_PROFILE'
  );

-- Adicionar permissão aos usuários com cargo ADMINISTRATOR
INSERT INTO user_permissions (id, "userProfileId", "tenantId", permission, "isGranted", "grantedBy", "grantedAt", "updatedAt")
SELECT
  gen_random_uuid(),
  up.id,
  up."tenantId",
  'CREATE_CLINICAL_PROFILE'::"PermissionType",
  true,
  u.id, -- granted by the user themselves (sistema)
  NOW(),
  NOW()
FROM users u
INNER JOIN user_profiles up ON up."userId" = u.id
WHERE up."positionCode" = 'ADMINISTRATOR'
  AND NOT EXISTS (
    SELECT 1
    FROM user_permissions upe
    WHERE upe."userProfileId" = up.id
      AND upe.permission = 'CREATE_CLINICAL_PROFILE'
  );

-- Mostrar quantos usuários foram atualizados
SELECT
  up."positionCode",
  COUNT(*) as total_users_updated
FROM users u
INNER JOIN user_profiles up ON up."userId" = u.id
INNER JOIN user_permissions upe ON upe."userProfileId" = up.id
WHERE upe.permission = 'CREATE_CLINICAL_PROFILE'
GROUP BY up."positionCode";
