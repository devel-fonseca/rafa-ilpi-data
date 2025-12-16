-- Script para adicionar permissões de visualização para Cuidadores
-- Problema: Cuidadores não conseguem ver residentes nem registros diários

-- Adicionar permissão VIEW_RESIDENTS para o papel "Cuidador"
INSERT INTO "RolePermission" ("roleId", "permissionType", "createdAt", "updatedAt")
SELECT
    r.id,
    'VIEW_RESIDENTS'::enum_RolePermission_permissionType,
    NOW(),
    NOW()
FROM "Role" r
WHERE r.name = 'Cuidador'
AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r.id
    AND rp."permissionType" = 'VIEW_RESIDENTS'
);

-- Adicionar permissão VIEW_DAILY_RECORDS para o papel "Cuidador"
INSERT INTO "RolePermission" ("roleId", "permissionType", "createdAt", "updatedAt")
SELECT
    r.id,
    'VIEW_DAILY_RECORDS'::enum_RolePermission_permissionType,
    NOW(),
    NOW()
FROM "Role" r
WHERE r.name = 'Cuidador'
AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r.id
    AND rp."permissionType" = 'VIEW_DAILY_RECORDS'
);

-- Adicionar permissão VIEW_REPORTS para o papel "Cuidador"
INSERT INTO "RolePermission" ("roleId", "permissionType", "createdAt", "updatedAt")
SELECT
    r.id,
    'VIEW_REPORTS'::enum_RolePermission_permissionType,
    NOW(),
    NOW()
FROM "Role" r
WHERE r.name = 'Cuidador'
AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r.id
    AND rp."permissionType" = 'VIEW_REPORTS'
);

-- Verificar as permissões adicionadas
SELECT
    r.name as papel,
    rp."permissionType" as permissao,
    rp."createdAt" as criado_em
FROM "Role" r
JOIN "RolePermission" rp ON rp."roleId" = r.id
WHERE r.name = 'Cuidador'
AND rp."permissionType" IN ('VIEW_RESIDENTS', 'VIEW_DAILY_RECORDS', 'VIEW_REPORTS')
ORDER BY rp."createdAt" DESC;
