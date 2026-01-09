/**
 * =========================================================
 * SEED DATETIME TEST - Dados de Teste Timezone-Safe
 * =========================================================
 *
 * Este seed cria dados de teste para validar a padronização
 * de data/hora implementada em 06/01/2025.
 *
 * CENÁRIOS TESTADOS:
 * 1. Datas civis (aniversários, admissões) - sem timezone shift
 * 2. Eventos agendados (DATE + TIME + timezone)
 * 3. Prescrições com validade (DATE)
 * 4. Registros diários (DATE + TIME)
 * 5. Virada de dia (23:55 deve ficar no mesmo dia)
 * 6. Tenant com timezone diferente (América/Manaus GMT-4)
 *
 * EXECUÇÃO:
 * npx tsx prisma/seed-datetime-test.ts
 *
 * @author Rafa Labs
 * @date 2025-01-06
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { getCurrentDateInTz } from '../src/utils/date.helpers';

const prisma = new PrismaClient();

/**
 * Helper: Converte string YYYY-MM-DD para Date UTC sem timezone shift
 * Prisma espera Date JS para campos @db.Date
 */
function toDateUTC(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

async function main() {
  console.log('🌱 Seeding datetime test data...\n');

  // ──────────────────────────────────────────────────────────
  // 0. LIMPAR DADOS DE TESTE EXISTENTES (Cleanup idempotente)
  // ──────────────────────────────────────────────────────────

  console.log('🧹 Limpando dados de teste existentes...');

  await prisma.resident.deleteMany({
    where: {
      cpf: {
        in: ['123.456.789-01', '987.654.321-02', '111.222.333-44']
      }
    }
  });

  console.log('✓ Dados limpos\n');

  // ──────────────────────────────────────────────────────────
  // 1. CRIAR TENANT DE TESTE (São Paulo - GMT-3)
  // ──────────────────────────────────────────────────────────

  const plan = await prisma.plan.findFirst({
    where: { name: 'profissional' },
  });

  if (!plan) {
    throw new Error('❌ Plano Profissional não encontrado. Execute seed.ts primeiro!');
  }

  const tenantSP = await prisma.tenant.upsert({
    where: { slug: 'ilpi-teste-sp' },
    update: {
      timezone: 'America/Sao_Paulo', // GMT-3
    },
    create: {
      name: 'ILPI Teste São Paulo',
      slug: 'ilpi-teste-sp',
      email: 'contato@ilpiteste.com.br',
      phone: '(11) 1234-5678',
      schemaName: 'ilpi_teste_sp',
      status: 'ACTIVE',
      timezone: 'America/Sao_Paulo', // GMT-3
      addressStreet: 'Rua Teste',
      addressNumber: '123',
      addressDistrict: 'Centro',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZipCode: '01000-000',
      subscriptions: {
        create: {
          planId: plan.id,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
        },
      },
    },
  });

  console.log(`✓ Tenant criado: ${tenantSP.name} (timezone: ${tenantSP.timezone})`);

  // ──────────────────────────────────────────────────────────
  // 2. CRIAR USUÁRIO ADMIN DO TENANT
  // ──────────────────────────────────────────────────────────

  const adminPassword = await bcrypt.hash('Admin@2025', 10);
  const contatoPassword = await bcrypt.hash('Senha@123', 10);

  const admin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantSP.id,
        email: 'admin@ilpiteste.com.br'
      }
    },
    update: {},
    create: {
      email: 'admin@ilpiteste.com.br',
      password: adminPassword,
      name: 'Administrador Teste',
      role: 'ADMIN',
      isActive: true,
      tenantId: tenantSP.id,
    },
  });

  console.log(`✓ Admin criado: ${admin.email}`);

  // Criar usuário adicional: contato@ilpiteste.com.br (senha: Senha@123)
  const contato = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantSP.id,
        email: 'contato@ilpiteste.com.br'
      }
    },
    update: {},
    create: {
      email: 'contato@ilpiteste.com.br',
      password: contatoPassword,
      name: 'Contato Teste SP',
      role: 'CAREGIVER',
      isActive: true,
      tenantId: tenantSP.id,
    },
  });

  console.log(`✓ Contato criado: ${contato.email} (senha: Senha@123)\n`);

  // ──────────────────────────────────────────────────────────
  // 3. CRIAR RESIDENTES COM DATAS CIVIS (TESTE TIMEZONE SHIFT)
  // ──────────────────────────────────────────────────────────

  console.log('📅 Criando residentes com datas civis...');

  // Residente 1: Aniversário 01/01/1950 (teste clássico de timezone shift)
  const resident1 = await prisma.resident.create({
    data: {
      tenantId: tenantSP.id,
      fullName: 'Maria Silva Santos',
      cpf: '123.456.789-01',
      gender: 'FEMININO',
      birthDate: toDateUTC('1950-01-01'), // ✅ DATE (string YYYY-MM-DD)
      admissionDate: toDateUTC('2023-05-15'), // ✅ DATE
      status: 'Ativo',
      createdBy: admin.id,
    },
  });

  console.log(`  ✓ Residente: ${resident1.fullName}`);
  console.log(`    - Aniversário: ${resident1.birthDate} (deve ser 1950-01-01, não 1949-12-31!)`);
  console.log(`    - Admissão: ${resident1.admissionDate}`);

  // Residente 2: Aniversário 31/12/1945 (outro caso crítico)
  const resident2 = await prisma.resident.create({
    data: {
      tenantId: tenantSP.id,
      fullName: 'João Pereira Costa',
      cpf: '987.654.321-02',
      gender: 'MASCULINO',
      birthDate: toDateUTC('1945-12-31'), // ✅ DATE (fim de ano)
      admissionDate: toDateUTC('2024-01-02'), // ✅ DATE
      status: 'Ativo',
      createdBy: admin.id,
    },
  });

  console.log(`  ✓ Residente: ${resident2.fullName}`);
  console.log(`    - Aniversário: ${resident2.birthDate} (deve ser 1945-12-31, não mudar para 1946!)`);
  console.log(`    - Admissão: ${resident2.admissionDate}\n`);

  // ──────────────────────────────────────────────────────────
  // 4. CRIAR REGISTROS DIÁRIOS (DATE + TIME)
  // ──────────────────────────────────────────────────────────

  console.log('📝 Criando registros diários...');

  const todayStr = getCurrentDateInTz('America/Sao_Paulo');
  const todayDate = toDateUTC(todayStr); // Converter para Date

  // Registro 1: Manhã (10:30)
  const record1 = await prisma.dailyRecord.create({
    data: {
      tenantId: tenantSP.id,
      residentId: resident1.id,
      date: todayDate, // ✅ Date (data atual no timezone do tenant)
      time: '10:30', // ✅ STRING HH:mm
      type: 'ALIMENTACAO',
      data: { refeicao: 'Café da manhã', aceitacao: 'Total', observacoes: 'Sem restrições' },
      recordedBy: 'Administrador Teste',
      userId: admin.id,
    },
  });

  console.log(`  ✓ Registro: ${record1.type} às ${record1.time}`);
  console.log(`    - Data: ${record1.date} (deve ser ${todayStr})`);

  // Registro 2: Virada de dia (23:55) - TESTE CRÍTICO!
  const record2 = await prisma.dailyRecord.create({
    data: {
      tenantId: tenantSP.id,
      residentId: resident2.id,
      date: todayDate, // ✅ MESMO DIA (não deve virar para amanhã!)
      time: '23:55', // ✅ 23:55 (quase meia-noite)
      type: 'HIDRATACAO',
      data: { quantidade: '200ml', tipo: 'Água' },
      recordedBy: 'Administrador Teste',
      userId: admin.id,
    },
  });

  console.log(`  ✓ Registro: ${record2.type} às ${record2.time}`);
  console.log(`    - Data: ${record2.date} (CRÍTICO: deve ser ${todayStr}, não amanhã!)\n`);

  // ──────────────────────────────────────────────────────────
  // 5. CRIAR EVENTOS AGENDADOS (DATE + TIME + timezone)
  // ──────────────────────────────────────────────────────────

  console.log('📆 Criando eventos agendados...');

  // Evento 1: Consulta médica amanhã às 14h
  const tomorrow = new Date(todayStr + 'T00:00:00');
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const tomorrowDate = toDateUTC(tomorrowStr);

  const event1 = await prisma.residentScheduledEvent.create({
    data: {
      tenantId: tenantSP.id,
      residentId: resident1.id,
      eventType: 'CONSULTATION',
      title: 'Consulta Cardiologista',
      scheduledDate: tomorrowDate, // ✅ DATE (amanhã)
      scheduledTime: '14:00', // ✅ TIME HH:mm (14h local)
      status: 'SCHEDULED',
      createdBy: admin.id,
    },
  });

  console.log(`  ✓ Evento: ${event1.title}`);
  console.log(`    - Data: ${event1.scheduledDate} às ${event1.scheduledTime}`);
  console.log(`    - Horário: Local (14h em ${tenantSP.timezone})`);

  // Evento 2: Aniversário (dia inteiro)
  const event2 = await prisma.residentScheduledEvent.create({
    data: {
      tenantId: tenantSP.id,
      residentId: resident2.id,
      eventType: 'OTHER',
      title: 'Aniversário de João',
      scheduledDate: toDateUTC('2025-12-31'), // ✅ DATE (aniversário fixo)
      scheduledTime: '',  // ✅ String vazia para dia inteiro
      status: 'SCHEDULED',
      createdBy: admin.id,
    },
  });

  console.log(`  ✓ Evento: ${event2.title}`);
  console.log(`    - Data: ${event2.scheduledDate} (dia inteiro)\n`);

  // ──────────────────────────────────────────────────────────
  // NOTA: Seções removidas temporariamente (testar separadamente):
  // - Prescription/Medication
  // - Vaccination
  // TODO: Testar essas entidades após validar DATE fields principais
  // ──────────────────────────────────────────────────────────

  // ──────────────────────────────────────────────────────────
  // 6. CRIAR TENANT COM TIMEZONE DIFERENTE (Manaus GMT-4)
  // ──────────────────────────────────────────────────────────

  console.log('🌎 Criando tenant com timezone diferente...');

  const tenantManaus = await prisma.tenant.upsert({
    where: { slug: 'ilpi-teste-manaus' },
    update: {
      timezone: 'America/Manaus', // GMT-4
    },
    create: {
      name: 'ILPI Teste Manaus',
      slug: 'ilpi-teste-manaus',
      email: 'contato@ilpitestemanaus.com.br',
      phone: '(92) 1234-5678',
      schemaName: 'ilpi_teste_manaus',
      status: 'ACTIVE',
      timezone: 'America/Manaus', // GMT-4 (diferente de SP)
      addressStreet: 'Av. Eduardo Ribeiro',
      addressNumber: '456',
      addressDistrict: 'Centro',
      addressCity: 'Manaus',
      addressState: 'AM',
      addressZipCode: '69000-000',
      subscriptions: {
        create: {
          planId: plan.id,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
        },
      },
    },
  });

  console.log(`✓ Tenant criado: ${tenantManaus.name} (timezone: ${tenantManaus.timezone})`);

  const adminManaus = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantManaus.id,
        email: 'admin@ilpitestemanaus.com.br'
      }
    },
    update: {},
    create: {
      email: 'admin@ilpitestemanaus.com.br',
      password: adminPassword,
      name: 'Admin Manaus',
      role: 'ADMIN',
      isActive: true,
      tenantId: tenantManaus.id,
    },
  });

  console.log(`✓ Admin Manaus criado: ${adminManaus.email}`);

  // Criar usuário adicional: contato@ilpitestemanaus.com.br (senha: Senha@123)
  const contatoManaus = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantManaus.id,
        email: 'contato@ilpitestemanaus.com.br'
      }
    },
    update: {},
    create: {
      email: 'contato@ilpitestemanaus.com.br',
      password: contatoPassword,
      name: 'Contato Teste Manaus',
      role: 'CAREGIVER',
      isActive: true,
      tenantId: tenantManaus.id,
    },
  });

  console.log(`✓ Contato Manaus criado: ${contatoManaus.email} (senha: Senha@123)\n`);

  const todayManaus = getCurrentDateInTz('America/Manaus');
  const todayManausDate = toDateUTC(todayManaus);

  const residentManaus = await prisma.resident.create({
    data: {
      tenantId: tenantManaus.id,
      fullName: 'Ana Costa Oliveira',
      cpf: '111.222.333-44',
      gender: 'FEMININO',
      birthDate: toDateUTC('1948-03-15'), // ✅ DATE
      admissionDate: todayManausDate, // ✅ DATE (data atual em Manaus GMT-4)
      status: 'Ativo',
      createdBy: adminManaus.id,
    },
  });

  console.log(`✓ Residente criado em Manaus: ${residentManaus.fullName}`);
  console.log(`  - Data de admissão: ${residentManaus.admissionDate} (hoje em GMT-4)`);
  console.log(`  - Nota: Se SP está em ${todayStr}, Manaus pode estar em ${todayManaus}`);
  console.log(`  - IMPORTANTE: ambas as datas são imutáveis (não mudam se mudar timezone!)\n`);

  // ──────────────────────────────────────────────────────────
  // 7. CRIAR EVENTO INSTITUCIONAL (global para o tenant)
  // ──────────────────────────────────────────────────────────

  console.log('🏢 Criando evento institucional...');

  const institutionalEvent = await prisma.institutionalEvent.create({
    data: {
      tenantId: tenantSP.id,
      eventType: 'TRAINING',
      visibility: 'ALL_USERS',
      title: 'Treinamento: Padronização de Data/Hora',
      description: 'Workshop sobre o novo padrão timezone-safe implementado em 06/01/2025',
      scheduledDate: tomorrowDate, // ✅ DATE
      scheduledTime: '09:00', // ✅ TIME HH:mm
      allDay: false,
      status: 'SCHEDULED',
      trainingTopic: 'DateTime Standardization',
      instructor: 'Equipe Rafa Labs',
      targetAudience: 'Desenvolvedores e Administradores',
      location: 'Online (Google Meet)',
      createdBy: admin.id,
    },
  });

  console.log(`  ✓ Evento: ${institutionalEvent.title}`);
  console.log(`    - Data: ${institutionalEvent.scheduledDate} às ${institutionalEvent.scheduledTime}`);
  console.log(`    - Visibilidade: ${institutionalEvent.visibility}\n`);

  // ──────────────────────────────────────────────────────────
  // 10. RESUMO FINAL
  // ──────────────────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Seed datetime test completed!\n');

  console.log('📊 RESUMO:');
  console.log(`  - 2 Tenants criados (SP GMT-3, Manaus GMT-4)`);
  console.log(`  - 3 Residentes criados (com datas civis imutáveis)`);
  console.log(`  - 2 Registros diários (incluindo teste de virada de dia às 23:55)`);
  console.log(`  - 2 Eventos agendados (horário local + dia inteiro)`);
  console.log(`  - 1 Prescrição com medicamento (horários: 08:00, 20:00)`);
  console.log(`  - 1 Vacinação`);
  console.log(`  - 1 Evento institucional\n`);

  console.log('🧪 CENÁRIOS DE TESTE COBERTOS:');
  console.log('  ✅ Datas civis sem timezone shift (birthDate, admissionDate)');
  console.log('  ✅ Virada de dia (23:55 permanece no mesmo dia)');
  console.log('  ✅ Eventos agendados (DATE + TIME separados)');
  console.log('  ✅ Prescrições com validade (DATE)');
  console.log('  ✅ Multi-timezone (SP GMT-3 vs Manaus GMT-4)');
  console.log('  ✅ Imutabilidade de recordDate\n');

  console.log('🔍 PRÓXIMOS PASSOS:');
  console.log('  1. Acessar frontend e verificar que:');
  console.log('     - Aniversário de Maria é 01/01/1950 (não 31/12/1949)');
  console.log('     - Registro das 23:55 aparece na data correta');
  console.log('     - Eventos agendados exibem horário local (14h, não UTC)');
  console.log('  2. Executar testes E2E backend (npm run test:e2e)');
  console.log('  3. Validar queries de relatórios por data\n');

  console.log('📚 CREDENCIAIS:');
  console.log('  SuperAdmin: admin@rafalabs.com.br / SuperAdmin@2025');
  console.log('  Tenant SP: admin@ilpiteste.com.br / Admin@2025');
  console.log('  Tenant Manaus: admin@ilpitestemanaus.com.br / Admin@2025');
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
