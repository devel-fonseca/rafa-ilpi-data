-- Script para adicionar permissões de visualização de dados clínicos para Cuidadores
-- Problema: Cuidadores não conseguem ver alergias, condições e restrições alimentares
-- Essas permissões são CRÍTICAS para prestação de cuidados seguros

-- Obter um usuário admin para usar como grantedBy (necessário para auditoria)
DO $$
DECLARE
    admin_user_id uuid;
    caregiver_profile record;
BEGIN
    -- Buscar o primeiro usuário administrador
    SELECT u.id INTO admin_user_id
    FROM users u
    JOIN user_profiles up ON up."userId" = u.id
    WHERE up."positionCode" = 'ADMINISTRATOR'
    LIMIT 1;

    -- Se não encontrar admin, usar o primeiro usuário disponível
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM users LIMIT 1;
    END IF;

    -- Iterar sobre todos os cuidadores e adicionar as 3 permissões clínicas essenciais
    FOR caregiver_profile IN
        SELECT up.id as profile_id, up."tenantId" as tenant_id, u.name
        FROM user_profiles up
        JOIN users u ON u.id = up."userId"
        WHERE up."positionCode" = 'CAREGIVER'
    LOOP
        -- Adicionar permissão VIEW_ALLERGIES (CRÍTICO)
        INSERT INTO user_permissions (id, "userProfileId", "tenantId", permission, "isGranted", "grantedBy", "grantedAt", "createdAt", "updatedAt")
        VALUES (
            gen_random_uuid(),
            caregiver_profile.profile_id,
            caregiver_profile.tenant_id,
            'VIEW_ALLERGIES'::"PermissionType",
            true,
            admin_user_id,
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT ("userProfileId", permission) DO NOTHING;

        -- Adicionar permissão VIEW_CONDITIONS (IMPORTANTE)
        INSERT INTO user_permissions (id, "userProfileId", "tenantId", permission, "isGranted", "grantedBy", "grantedAt", "createdAt", "updatedAt")
        VALUES (
            gen_random_uuid(),
            caregiver_profile.profile_id,
            caregiver_profile.tenant_id,
            'VIEW_CONDITIONS'::"PermissionType",
            true,
            admin_user_id,
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT ("userProfileId", permission) DO NOTHING;

        -- Adicionar permissão VIEW_DIETARY_RESTRICTIONS (ESSENCIAL)
        INSERT INTO user_permissions (id, "userProfileId", "tenantId", permission, "isGranted", "grantedBy", "grantedAt", "createdAt", "updatedAt")
        VALUES (
            gen_random_uuid(),
            caregiver_profile.profile_id,
            caregiver_profile.tenant_id,
            'VIEW_DIETARY_RESTRICTIONS'::"PermissionType",
            true,
            admin_user_id,
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT ("userProfileId", permission) DO NOTHING;

        RAISE NOTICE 'Permissões clínicas adicionadas para: %', caregiver_profile.name;
    END LOOP;
END $$;

-- Verificar TODAS as permissões dos cuidadores
SELECT
    u.name as cuidador,
    u.email,
    up."positionCode",
    perm.permission,
    perm."isGranted",
    perm."grantedAt"
FROM users u
JOIN user_profiles up ON up."userId" = u.id
JOIN user_permissions perm ON perm."userProfileId" = up.id
WHERE up."positionCode" = 'CAREGIVER'
ORDER BY u.name, perm.permission;
