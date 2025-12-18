/**
 * Script para adicionar permissão VIEW_RESIDENT_SCHEDULE a usuários existentes
 * Execute com: npx tsx scripts/add-schedule-permissions.ts
 */

import { PrismaClient, PermissionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando usuários sem VIEW_RESIDENT_SCHEDULE...\n');

  // Buscar todos os UserProfiles com suas permissões customizadas
  const allProfiles = await prisma.userProfile.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      customPermissions: {
        where: {
          permission: PermissionType.VIEW_RESIDENT_SCHEDULE,
        },
      },
    },
  });

  // Filtrar perfis que NÃO têm a permissão VIEW_RESIDENT_SCHEDULE
  const profilesWithoutPermission = allProfiles.filter(
    (profile) => profile.customPermissions.length === 0,
  );

  console.log(`✅ Encontrados ${profilesWithoutPermission.length} usuários sem VIEW_RESIDENT_SCHEDULE:\n`);

  for (const profile of profilesWithoutPermission) {
    console.log(`   - ${profile.user.name} (${profile.user.email}) - ${profile.positionCode}`);
  }

  if (profilesWithoutPermission.length === 0) {
    console.log('\n✨ Todos os usuários já têm a permissão VIEW_RESIDENT_SCHEDULE!');
    return;
  }

  console.log('\n📝 Adicionando VIEW_RESIDENT_SCHEDULE...\n');

  // Para cada perfil, criar um registro de UserPermission
  // Usar o ID do próprio usuário como grantedBy (auto-concessão via script)
  for (const profile of profilesWithoutPermission) {
    await prisma.userPermission.create({
      data: {
        userProfileId: profile.id,
        tenantId: profile.tenantId,
        permission: PermissionType.VIEW_RESIDENT_SCHEDULE,
        isGranted: true,
        grantedBy: profile.userId, // Auto-concessão via script
      },
    });
    console.log(`   ✓ ${profile.user.name} - permissão adicionada`);
  }

  console.log('\n🎉 Todos os usuários foram atualizados com sucesso!');
  console.log('\n📊 Verificando resultado final...\n');

  // Verificar todos que agora têm a permissão
  const finalCheck = await prisma.userProfile.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      customPermissions: {
        where: {
          permission: PermissionType.VIEW_RESIDENT_SCHEDULE,
          isGranted: true,
        },
      },
    },
    where: {
      customPermissions: {
        some: {
          permission: PermissionType.VIEW_RESIDENT_SCHEDULE,
          isGranted: true,
        },
      },
    },
  });

  console.log(`✅ Total de ${finalCheck.length} usuários com VIEW_RESIDENT_SCHEDULE:\n`);
  for (const profile of finalCheck) {
    console.log(`   - ${profile.user.name} (${profile.user.email}) - ${profile.positionCode}`);
  }
}

main()
  .catch((error) => {
    console.error('\n❌ Erro ao executar script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
