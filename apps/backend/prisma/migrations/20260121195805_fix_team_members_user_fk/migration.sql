-- FixTeamMembersUserFK
--
-- PROBLEMA: team_members.userId aponta para public.users (ERRADO)
-- SOLUÇÃO: Dropar FK incorreta e não recriar (usuários estão no mesmo schema)
--
-- team_members está em tenant_xxx schema
-- users também está em tenant_xxx schema
-- Não precisa de FK cross-schema, Prisma gerencia a relação

DO $$
DECLARE
    schema_name TEXT;
BEGIN
    -- Iterar sobre todos os schemas tenant_*
    FOR schema_name IN
        SELECT nspname
        FROM pg_namespace
        WHERE nspname LIKE 'tenant_%'
    LOOP
        RAISE NOTICE 'Corrigindo FK em schema: %', schema_name;

        -- Dropar FK incorreta (apontava para public.users)
        EXECUTE format('ALTER TABLE %I.team_members DROP CONSTRAINT IF EXISTS team_members_userId_fkey;', schema_name);

        -- NÃO recriar a FK - ambos os modelos estão no mesmo schema
        -- Prisma gerencia a relação sem precisar de FK física
        -- Isso evita problemas de referência circular e simplifica a arquitetura

        RAISE NOTICE 'FK incorreta removida de %', schema_name;
    END LOOP;
END $$;
