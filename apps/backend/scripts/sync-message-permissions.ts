import { PrismaClient, PermissionType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para sincronizar permissões de mensagens aos usuários existentes
 *
 * Este script adiciona as permissões de mensagens (VIEW_MESSAGES, SEND_MESSAGES,
 * DELETE_MESSAGES, BROADCAST_MESSAGES) aos usuários que já existem no banco
 * de dados baseado em seus cargos (positionCode).
 */
async function syncMessagePermissions() {
  console.log('🔄 Iniciando sincronização de permissões de mensagens...\n');

  try {
    // 1. Buscar todos os perfis ativos de usuários
    const userProfiles = await prisma.userProfile.findMany({
      include: {
        user: true,
        customPermissions: true,
      },
    });

    // Filtrar apenas usuários ativos
    const activeProfiles = userProfiles.filter(
      profile => profile.user.isActive && !profile.user.deletedAt
    );

    console.log(`📋 Encontrados ${activeProfiles.length} usuários ativos\n`);

    let updatedCount = 0;

    for (const profile of activeProfiles) {
      const { user } = profile;
      const positionCode = profile.positionCode;

      if (!positionCode) {
        console.log(`⚠️  Usuário ${user.name} (${user.email}) não tem cargo definido - pulando`);
        continue;
      }

      console.log(`\n👤 Processando: ${user.name} (${user.email})`);
      console.log(`   Cargo: ${positionCode}`);

      // Definir quais permissões de mensagens o cargo deve ter
      const messagePermissions: PermissionType[] = [];

      // Todos os cargos têm pelo menos VIEW e SEND
      messagePermissions.push(
        PermissionType.VIEW_MESSAGES,
        PermissionType.SEND_MESSAGES,
      );

      // ADMINISTRATOR e TECHNICAL_MANAGER têm DELETE e BROADCAST
      if (
        positionCode === 'ADMINISTRATOR' ||
        positionCode === 'TECHNICAL_MANAGER'
      ) {
        messagePermissions.push(
          PermissionType.DELETE_MESSAGES,
          PermissionType.BROADCAST_MESSAGES
        );
      }

      // Verificar quais permissões o usuário já tem
      const existingPermissions = profile.customPermissions.map(p => p.permission);
      const missingPermissions = messagePermissions.filter(
        p => !existingPermissions.includes(p)
      );

      if (missingPermissions.length === 0) {
        console.log(`   ✅ Usuário já possui todas as permissões de mensagens`);
        continue;
      }

      console.log(`   📝 Adicionando permissões: ${missingPermissions.join(', ')}`);

      // Criar as permissões faltantes
      for (const permission of missingPermissions) {
        await prisma.userPermission.create({
          data: {
            userProfileId: profile.id,
            tenantId: profile.tenantId,
            permission,
            grantedBy: user.id, // Auto-granted pelo script
          },
        });
      }

      updatedCount++;
      console.log(`   ✅ Permissões adicionadas com sucesso`);
    }

    console.log(`\n✨ Sincronização concluída!`);
    console.log(`📊 Total de usuários atualizados: ${updatedCount}/${activeProfiles.length}`);

  } catch (error) {
    console.error('❌ Erro ao sincronizar permissões:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
syncMessagePermissions()
  .then(() => {
    console.log('\n✅ Script finalizado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script finalizado com erro:', error);
    process.exit(1);
  });
