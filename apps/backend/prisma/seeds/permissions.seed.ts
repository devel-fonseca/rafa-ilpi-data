/**
 * Seed de Permissões ILPI
 *
 * Configura cargos padrão para usuários existentes que ainda não possuem positionCode
 */

import { PrismaClient, PositionCode, RegistrationType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPermissions() {
  console.log('🔐 Iniciando seed de permissões ILPI...');

  try {
    // Buscar todos os perfis de usuários que ainda não têm positionCode
    const profilesWithoutPosition = await prisma.userProfile.findMany({
      where: {
        positionCode: null,
      },
      include: {
        user: true,
      },
    });

    console.log(
      `📊 Encontrados ${profilesWithoutPosition.length} perfis sem cargo definido`,
    );

    // Atualizar perfis baseado no role do usuário
    for (const profile of profilesWithoutPosition) {
      let positionCode: PositionCode;
      let registrationType: RegistrationType | undefined;

      // Mapear role para positionCode padrão
      switch (profile.user.role) {
        case 'admin':
          positionCode = PositionCode.ADMINISTRATOR;
          break;
        case 'manager':
          positionCode = PositionCode.NURSING_COORDINATOR;
          registrationType = RegistrationType.COREN;
          break;
        case 'user':
          positionCode = PositionCode.CAREGIVER;
          break;
        default:
          positionCode = PositionCode.OTHER;
      }

      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          positionCode,
          registrationType,
        },
      });

      console.log(
        `✅ Perfil ${profile.user.name} atualizado para cargo: ${positionCode}`,
      );
    }

    console.log('✨ Seed de permissões concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar seed de permissões:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar seed se chamado diretamente
if (require.main === module) {
  seedPermissions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedPermissions;
