/**
 * Script para adicionar permissões de CARE_SHIFTS a usuários específicos
 *
 * Este script adiciona permissões customizadas de visualização e gerenciamento
 * de plantões/escalas de cuidados para usuários que precisam dessa funcionalidade.
 *
 * IMPORTANTE: UserProfile e UserPermission estão no schema do TENANT, não no public
 *
 * Execute com: npx tsx scripts/add-care-shifts-permissions.ts
 */

import { PrismaClient, PermissionType } from '@prisma/client';

const prisma = new PrismaClient();

// Permissões necessárias para usar o módulo Care Shifts
const CARE_SHIFTS_PERMISSIONS = [
  PermissionType.VIEW_CARE_SHIFTS,
  PermissionType.CREATE_CARE_SHIFTS,
  PermissionType.UPDATE_CARE_SHIFTS,
  PermissionType.DELETE_CARE_SHIFTS,
  PermissionType.MANAGE_TEAMS,
  PermissionType.VIEW_RDC_COMPLIANCE,
  PermissionType.CONFIGURE_SHIFT_SETTINGS,
];

async function main() {
  console.log('🔍 Buscando tenants e seus schemas...\n');

  // Buscar todos os tenants ativos
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, slug: true },
  });

  console.log(`📋 Encontrados ${tenants.length} tenants ativos\n`);

  for (const tenant of tenants) {
    console.log(`\n🔧 Processando tenant: ${tenant.name}`);

    // Buscar schema real no banco
    const schemaQuery: any = await prisma.$queryRawUnsafe(`
      SELECT nspname
      FROM pg_namespace
      WHERE nspname LIKE 'tenant_%'
      AND nspname LIKE '%${tenant.slug.replace(/[.-]/g, '_')}%'
      LIMIT 1
    `);

    if (!schemaQuery || schemaQuery.length === 0) {
      console.error(`  ❌ Schema não encontrado para tenant ${tenant.name}`);
      continue;
    }

    const schema = schemaQuery[0].nspname;
    console.log(`  📂 Schema: ${schema}`);

    try {
      // Buscar todos os user_profiles do tenant
      const profiles: any = await prisma.$queryRawUnsafe(`
        SELECT
          up.id as "profileId",
          up."userId",
          up."tenantId",
          u.name,
          u.email,
          up."positionCode"
        FROM "${schema}".user_profiles up
        JOIN "${schema}".users u ON u.id = up."userId"
        WHERE u."deletedAt" IS NULL
      `);

      console.log(`  👥 Encontrados ${profiles.length} usuários\n`);

      for (const profile of profiles) {
        console.log(`  📝 Processando: ${profile.name} (${profile.email})`);

        // Verificar permissões existentes
        const existingPerms: any = await prisma.$queryRawUnsafe(`
          SELECT permission
          FROM "${schema}".user_permissions
          WHERE "userProfileId" = '${profile.profileId}'
          AND permission IN (${CARE_SHIFTS_PERMISSIONS.map((p) => `'${p}'`).join(',')})
          AND "isGranted" = true
        `);

        const existingPermissions = existingPerms.map((p: any) => p.permission);
        const missingPermissions = CARE_SHIFTS_PERMISSIONS.filter(
          (perm) => !existingPermissions.includes(perm),
        );

        if (missingPermissions.length === 0) {
          console.log(`     ✓ Já tem todas as permissões (${CARE_SHIFTS_PERMISSIONS.length}/${CARE_SHIFTS_PERMISSIONS.length})`);
          continue;
        }

        console.log(`     ⚠ Faltam ${missingPermissions.length}/${CARE_SHIFTS_PERMISSIONS.length} permissões`);

        // Adicionar cada permissão faltante
        for (const permission of missingPermissions) {
          try {
            await prisma.$executeRawUnsafe(`
              INSERT INTO "${schema}".user_permissions (
                id,
                "userProfileId",
                "tenantId",
                permission,
                "isGranted",
                "grantedBy",
                "grantedAt",
                "createdAt",
                "updatedAt"
              ) VALUES (
                gen_random_uuid(),
                '${profile.profileId}',
                '${profile.tenantId}',
                '${permission}',
                true,
                '${profile.userId}',
                NOW(),
                NOW(),
                NOW()
              )
              ON CONFLICT ("userProfileId", permission)
              DO UPDATE SET
                "isGranted" = true,
                "grantedBy" = '${profile.userId}',
                "grantedAt" = NOW(),
                "updatedAt" = NOW()
            `);
            console.log(`     ✓ ${permission} - concedida`);
          } catch (error: any) {
            console.error(`     ✗ ${permission} - erro: ${error.message}`);
          }
        }
      }

      // Verificação final para este tenant
      const finalCheck: any = await prisma.$queryRawUnsafe(`
        SELECT
          u.name,
          u.email,
          up."positionCode",
          COUNT(DISTINCT uperm.permission) as "permCount"
        FROM "${schema}".user_profiles up
        JOIN "${schema}".users u ON u.id = up."userId"
        LEFT JOIN "${schema}".user_permissions uperm ON uperm."userProfileId" = up.id
          AND uperm.permission IN (${CARE_SHIFTS_PERMISSIONS.map((p) => `'${p}'`).join(',')})
          AND uperm."isGranted" = true
        WHERE u."deletedAt" IS NULL
        GROUP BY u.name, u.email, up."positionCode"
        HAVING COUNT(DISTINCT uperm.permission) > 0
      `);

      console.log(`\n  ✅ Resultado final para ${tenant.name}:`);
      for (const user of finalCheck) {
        console.log(
          `     - ${user.name} (${user.email}) - ${user.positionCode || 'sem cargo'} - ${user.permCount}/${CARE_SHIFTS_PERMISSIONS.length} permissões`,
        );
      }
    } catch (error: any) {
      console.error(`  ❌ Erro ao processar tenant ${tenant.name}:`, error.message);
    }
  }

  console.log('\n\n🎉 Script finalizado com sucesso!');
}

main()
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
