-- Criar perfis vazios para todos os usuários existentes que não têm perfil
INSERT INTO user_profiles (id, "userId", "tenantId", "createdBy", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  u.id,
  u."tenantId",
  u.id, -- O próprio usuário é o criador
  NOW(),
  NOW()
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up."userId" = u.id
);
