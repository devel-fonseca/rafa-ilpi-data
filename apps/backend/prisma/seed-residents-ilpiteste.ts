import { PrismaClient, Gender, CivilStatus } from '@prisma/client';
import { FieldEncryption } from '../src/prisma/middleware/field-encryption.class';

const prisma = new PrismaClient();
const fieldEncryption = new FieldEncryption();

/**
 * Seed 4/5: Criar Residentes ILPI Teste
 *
 * Cria 3 residentes fictícios para testes:
 * - Crispim Soares (78 anos, M, Solteiro)
 * - Fernão Mendes Pinto (77 anos, M)
 * - Joaquim Borba dos Santos (79 anos, M, Solteiro)
 */
async function main() {
  console.log('🌱 [4/5] Seeding Residents ILPI Teste...\n');

  // 1. Buscar Tenant (public schema para schemaName)
  const publicTenant = await prisma.tenant.findUnique({
    where: { cnpj: '51.482.599/0001-88' },
  });

  if (!publicTenant) {
    throw new Error('❌ Tenant não encontrado. Execute "npm run prisma:seed:tenant-ilpiteste" primeiro.');
  }

  // 2. Buscar ID do tenant dentro do seu próprio schema
  const tenantInSchema = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
    `SELECT id, name FROM ${publicTenant.schemaName}.tenants LIMIT 1`
  );

  if (tenantInSchema.length === 0) {
    throw new Error(`❌ Tenant não encontrado no schema ${publicTenant.schemaName}`);
  }

  const tenant = {
    id: tenantInSchema[0].id, // ID do schema do tenant (para FK)
    name: tenantInSchema[0].name,
    schemaName: publicTenant.schemaName,
  };

  console.log(`✓ Tenant encontrado: ${tenant.name}`);
  console.log(`  Schema: ${tenant.schemaName}`);
  console.log(`  ID: ${tenant.id}\n`);

  // 2. Residentes fictícios
  const residentsData = [
    {
      fullName: 'Crispim Soares',
      cpf: '123.456.789-01',
      birthDate: '1944-02-05',
      gender: 'MASCULINO' as Gender,
      civilStatus: 'SOLTEIRO' as CivilStatus,
      admissionDate: '2023-07-06',
      nationality: 'Brasileira',
    },
    {
      fullName: 'Fernão Mendes Pinto',
      cpf: '234.567.890-12',
      birthDate: '1947-11-05',
      gender: 'MASCULINO' as Gender,
      civilStatus: null,
      admissionDate: '2023-10-11',
      nationality: 'Brasileira',
    },
    {
      fullName: 'Joaquim Borba dos Santos',
      cpf: '345.678.901-23',
      birthDate: '1945-01-25',
      gender: 'MASCULINO' as Gender,
      civilStatus: 'SOLTEIRO' as CivilStatus,
      admissionDate: '2023-06-18',
      nationality: 'Brasileira',
    },
  ];

  let createdCount = 0;
  let existingCount = 0;

  for (const residentData of residentsData) {
    try {
      // Verificar se residente já existe
      const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
        SELECT id FROM ${tenant.schemaName}.residents
        WHERE cpf = '${residentData.cpf}' AND "deletedAt" IS NULL
        LIMIT 1
      `,
      );

      if (existing.length > 0) {
        console.log(`⚠ ${residentData.fullName} - Já existe`);
        existingCount++;
        continue;
      }

      // Buscar usuário admin para createdBy
      const adminUser = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${tenant.schemaName}.users WHERE role = 'ADMIN' LIMIT 1`
      );

      if (adminUser.length === 0) {
        throw new Error('❌ Nenhum usuário ADMIN encontrado. Execute o seed de usuários primeiro.');
      }

      const createdBy = adminUser[0].id;

      // Criptografar CPF (LGPD Art. 46 - dados sensíveis)
      const encryptedCpf = fieldEncryption.encrypt(residentData.cpf, tenant.id);

      // Criar residente
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${tenant.schemaName}.residents (
          id,
          "tenantId",
          status,
          "fullName",
          cpf,
          "birthDate",
          gender,
          "civilStatus",
          "admissionDate",
          nationality,
          "bloodType",
          "emergencyContacts",
          "healthPlans",
          "belongings",
          "createdBy",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          gen_random_uuid(),
          '${tenant.id}',
          'Ativo',
          '${residentData.fullName}',
          '${encryptedCpf}',
          '${residentData.birthDate}',
          '${residentData.gender}',
          ${residentData.civilStatus ? `'${residentData.civilStatus}'` : 'NULL'},
          '${residentData.admissionDate}',
          '${residentData.nationality}',
          'NAO_INFORMADO',
          '[]'::jsonb,
          '[]'::jsonb,
          '[]'::jsonb,
          '${createdBy}',
          NOW(),
          NOW()
        )
      `);

      const age = new Date().getFullYear() - new Date(residentData.birthDate).getFullYear();
      console.log(`✓ ${residentData.fullName} (${age} anos, ${residentData.gender})`);
      createdCount++;
    } catch (error) {
      console.error(`❌ Erro ao criar ${residentData.fullName}:`, error);
      throw error;
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   Criados: ${createdCount}`);
  console.log(`   Já existiam: ${existingCount}`);
  console.log(`   Total: ${residentsData.length}\n`);

  console.log('✅ Residentes ILPI Teste criados com sucesso!\n');
  console.log('📋 Próximo passo:');
  console.log('   npm run prisma:seed:prescriptions-ilpiteste\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
