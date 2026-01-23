import { PrismaClient, PositionCode, RegistrationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed 2/3: Criar Usuários ILPI Teste
 *
 * Cria 7 usuários com perfis completos:
 * - 2 ADMIN (John Galt, Dagny Taggart)
 * - 5 USER (4 Cuidadores + 1 Técnico de Enfermagem)
 *
 * Senha padrão: Senha@123
 */
async function main() {
  console.log('🌱 [2/3] Seeding Users ILPI Teste...\n');

  // 1. Buscar Tenant
  const tenant = await prisma.tenant.findUnique({
    where: { cnpj: '51.482.599/0001-88' },
  });

  if (!tenant) {
    throw new Error('❌ Tenant não encontrado. Execute "npm run prisma:seed:tenant-ilpiteste" primeiro.');
  }

  console.log(`✓ Tenant encontrado: ${tenant.name}\n`);

  // 2. Criar Usuários
  const hashedPassword = await bcrypt.hash('Senha@123', 10);

  const usersData = [
    {
      name: 'John Galt',
      email: 'admin@ilpiteste.com.br',
      role: 'ADMIN',
      cpf: '527.388.090-49',
      department: 'Administração',
      positionCode: 'ADMINISTRATOR' as PositionCode,
    },
    {
      name: 'Dagny Taggart',
      email: 'rt@ilpiteste.com.br',
      role: 'ADMIN',
      cpf: '53277135390',
      positionCode: 'TECHNICAL_MANAGER' as PositionCode,
      registrationNumber: '123456',
      registrationState: 'SP',
      registrationType: 'COREN' as RegistrationType,
    },
    {
      name: 'Eddie Willers',
      email: 'cuidador.dia1@ilpiteste.com.br',
      role: 'USER',
      cpf: '02371168394',
      positionCode: 'CAREGIVER' as PositionCode,
    },
    {
      name: 'Nathaniel Branden',
      email: 'tecnico@ilpiteste.com.br',
      role: 'USER',
      cpf: '75375579006',
      positionCode: 'NURSING_TECHNICIAN' as PositionCode,
      registrationNumber: '223456',
      registrationState: 'SP',
      registrationType: 'COREN' as RegistrationType,
    },
    {
      name: 'Wesley Mouch',
      email: 'cuidador.noite1@ilpiteste.com.br',
      role: 'USER',
      cpf: '36835070390',
      positionCode: 'CAREGIVER' as PositionCode,
    },
    {
      name: 'Hugh Askton',
      email: 'cuidador.dia2@ilpiteste.com.br',
      role: 'USER',
      cpf: '39208334309',
      positionCode: 'CAREGIVER' as PositionCode,
    },
    {
      name: 'Floyd Ferris',
      email: 'cuidador.noite2@ilpiteste.com.br',
      role: 'USER',
      cpf: '01822728509',
      positionCode: 'CAREGIVER' as PositionCode,
    },
  ];

  let createdCount = 0;
  let existingCount = 0;

  for (const userData of usersData) {
    try {
      // Verificar se usuário já existe
      const existingUser = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${tenant.schemaName}.users WHERE email = '${userData.email}' LIMIT 1`,
      );

      if (existingUser.length > 0) {
        console.log(`⚠ ${userData.name} (${userData.email}) - Já existe`);
        existingCount++;
        continue;
      }

      // Criar usuário
      const userId = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
        INSERT INTO ${tenant.schemaName}.users (
          id, "tenantId", email, name, password, role, "isActive", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid(),
          '${tenant.id}',
          '${userData.email}',
          '${userData.name}',
          '${hashedPassword}',
          '${userData.role}',
          true,
          NOW(),
          NOW()
        )
        RETURNING id
      `,
      );

      const userIdValue = userId[0].id;

      // Criar User Profile
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${tenant.schemaName}.user_profiles (
          id, "userId", "tenantId", cpf, department, "positionCode",
          "registrationNumber", "registrationState", "registrationType",
          "isNursingCoordinator", "isTechnicalManager",
          "createdBy", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid(),
          '${userIdValue}',
          '${tenant.id}',
          ${userData.cpf ? `'${userData.cpf}'` : 'NULL'},
          ${userData.department ? `'${userData.department}'` : 'NULL'},
          ${userData.positionCode ? `'${userData.positionCode}'` : 'NULL'},
          ${userData.registrationNumber ? `'${userData.registrationNumber}'` : 'NULL'},
          ${userData.registrationState ? `'${userData.registrationState}'` : 'NULL'},
          ${userData.registrationType ? `'${userData.registrationType}'` : 'NULL'},
          false,
          false,
          '${userIdValue}',
          NOW(),
          NOW()
        )
      `);

      console.log(`✓ ${userData.name} (${userData.email}) - ${userData.role} - ${userData.positionCode}`);
      createdCount++;
    } catch (error) {
      console.error(`❌ Erro ao criar ${userData.name}:`, error);
      throw error;
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   Criados: ${createdCount}`);
  console.log(`   Já existiam: ${existingCount}`);
  console.log(`   Total: ${usersData.length}\n`);

  console.log('✅ Usuários ILPI Teste criados com sucesso!\n');
  console.log('🔑 Login credentials:');
  console.log('   Email: admin@ilpiteste.com.br');
  console.log('   Password: Senha@123\n');
  console.log('📋 Próximo passo:');
  console.log('   npm run prisma:seed:shifts-ilpiteste\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
