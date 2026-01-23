import { PrismaClient } from '@prisma/client';
import { FIXED_SHIFT_TEMPLATE_IDS } from '../prisma/seeds/shift-templates.seed';
import * as readline from 'readline';

// ──────────────────────────────────────────────────────────────────────────────
//  SCRIPT - Migração de Referências Órfãs em ShiftTemplateId
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Migra referências órfãs de shiftTemplateId para UUIDs fixos
 *
 * CONTEXTO:
 * - IDs órfãos foram gerados antes da migração para UUIDs fixos
 * - Este script mapeia IDs antigos para novos IDs fixos baseado no tipo do turno
 * - Requer confirmação interativa antes de executar (medida de segurança)
 *
 * COMO USAR:
 * 1. Execute o diagnóstico primeiro: npx tsx scripts/diagnose-orphan-shift-assignments.ts
 * 2. Ajuste MIGRATION_MAP abaixo conforme os IDs órfãos encontrados
 * 3. Execute este script: npx tsx scripts/migrate-orphan-shift-assignments.ts
 * 4. Confirme a operação quando solicitado
 *
 * SEGURANÇA:
 * - Somente atualiza registros ativos (deletedAt IS NULL)
 * - Exibe contadores de registros afetados
 * - Requer confirmação explícita do usuário
 */

const publicPrisma = new PrismaClient();

// ────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO: Mapa de migração (ajustar conforme diagnóstico)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Mapeamento de IDs órfãos → IDs fixos
 *
 * IMPORTANTE: Ajuste este mapa baseado no output do script de diagnóstico!
 *
 * Formato: { 'UUID_ORFAO': FIXED_SHIFT_TEMPLATE_IDS.TIPO_CORRETO }
 *
 * Exemplo real do sistema:
 * - '5394055b-822d-4e1e-965a-e3963c855db0' era usado para "Dia 12h"
 * - '5d9431a0-6e49-4ac6-bd41-a6c6e7bc10d4' era usado para "Noite 12h"
 */
const MIGRATION_MAP: Record<string, string> = {
  // IDs órfãos encontrados no diagnóstico → Novos IDs fixos
  '5394055b-822d-4e1e-965a-e3963c855db0': FIXED_SHIFT_TEMPLATE_IDS.DAY_12H,
  '5d9431a0-6e49-4ac6-bd41-a6c6e7bc10d4': FIXED_SHIFT_TEMPLATE_IDS.NIGHT_12H,

  // Adicione mais mapeamentos conforme necessário:
  // 'outro-uuid-orfao': FIXED_SHIFT_TEMPLATE_IDS.DAY_8H,
};

// ────────────────────────────────────────────────────────────────────────────

/**
 * Solicita confirmação interativa do usuário
 */
async function confirmAction(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Migra referências órfãs em um tenant específico
 */
async function migrateTenantOrphans(
  tenant: { name: string; schemaName: string },
): Promise<{ assignments: number; shifts: number }> {
  const tenantClient = new PrismaClient({
    datasources: {
      db: {
        url: `${process.env.DATABASE_URL}?schema=${tenant.schemaName}`,
      },
    },
  });

  let totalAssignments = 0;
  let totalShifts = 0;

  try {
    for (const [oldId, newId] of Object.entries(MIGRATION_MAP)) {
      // Atualizar weekly_schedule_pattern_assignments
      const assignmentsResult = await tenantClient.$executeRaw`
        UPDATE weekly_schedule_pattern_assignments
        SET "shiftTemplateId" = ${newId}::uuid
        WHERE "shiftTemplateId" = ${oldId}::uuid
      `;

      // Atualizar shifts (somente ativos)
      const shiftsResult = await tenantClient.$executeRaw`
        UPDATE shifts
        SET "shiftTemplateId" = ${newId}::uuid
        WHERE "shiftTemplateId" = ${oldId}::uuid
        AND "deletedAt" IS NULL
      `;

      if (assignmentsResult > 0 || shiftsResult > 0) {
        console.log(`   ✅ ${oldId.substring(0, 8)}... → ${newId.substring(0, 8)}...`);
        console.log(
          `      Assignments: ${assignmentsResult}, Shifts: ${shiftsResult}`,
        );

        totalAssignments += assignmentsResult;
        totalShifts += shiftsResult;
      }
    }

    return { assignments: totalAssignments, shifts: totalShifts };
  } finally {
    await tenantClient.$disconnect();
  }
}

/**
 * Execução principal
 */
async function migrateOrphans() {
  console.log('🔄 Migração de Referências Órfãs de ShiftTemplateId\n');
  console.log(`${'='.repeat(80)}\n`);

  try {
    // 1. Validar mapa de migração
    if (Object.keys(MIGRATION_MAP).length === 0) {
      console.log('⚠️  MIGRATION_MAP está vazio!');
      console.log(
        '\n💡 Configure MIGRATION_MAP neste arquivo baseado no diagnóstico:',
      );
      console.log('   npx tsx scripts/diagnose-orphan-shift-assignments.ts\n');
      return;
    }

    // 2. Exibir mapa de migração
    console.log('📋 Mapa de Migração Configurado:\n');
    Object.entries(MIGRATION_MAP).forEach(([oldId, newId], index) => {
      const type = Object.keys(FIXED_SHIFT_TEMPLATE_IDS).find(
        (key) => FIXED_SHIFT_TEMPLATE_IDS[key] === newId,
      );
      console.log(`   ${index + 1}. ${oldId}`);
      console.log(`      → ${newId} (${type})\n`);
    });

    // 3. Buscar tenants
    const tenants = await publicPrisma.tenant.findMany({
      where: { deletedAt: null },
      select: { name: true, schemaName: true },
      orderBy: { name: 'asc' },
    });

    console.log(`📊 Tenants a processar: ${tenants.length}\n`);

    // 4. Solicitar confirmação
    console.log('⚠️  ATENÇÃO: Esta operação irá ATUALIZAR dados no banco!');
    const confirmed = await confirmAction(
      '\n🔒 Confirma a execução da migração?',
    );

    if (!confirmed) {
      console.log('\n❌ Operação cancelada pelo usuário\n');
      return;
    }

    console.log('\n🚀 Iniciando migração...\n');
    console.log(`${'='.repeat(80)}\n`);

    // 5. Processar cada tenant
    let totalTenantsProcessed = 0;
    let totalAssignmentsMigrated = 0;
    let totalShiftsMigrated = 0;

    for (const tenant of tenants) {
      console.log(`\n📋 Processando: ${tenant.name}`);
      console.log(`   Schema: ${tenant.schemaName}\n`);

      try {
        const result = await migrateTenantOrphans(tenant);

        if (result.assignments > 0 || result.shifts > 0) {
          totalTenantsProcessed++;
          totalAssignmentsMigrated += result.assignments;
          totalShiftsMigrated += result.shifts;

          console.log(
            `   ✅ Migrado: ${result.assignments} assignment(s) + ${result.shifts} shift(s)\n`,
          );
        } else {
          console.log('   ℹ️  Nenhum órfão encontrado (já migrado?)\n');
        }
      } catch (error) {
        console.error(`   ❌ Erro ao migrar ${tenant.name}:`, error.message);
      }
    }

    // 6. Resumo final
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 RESUMO FINAL DA MIGRAÇÃO');
    console.log(`${'='.repeat(80)}\n`);

    console.log(`   Tenants processados: ${totalTenantsProcessed}`);
    console.log(`   Assignments migrados: ${totalAssignmentsMigrated}`);
    console.log(`   Shifts migrados: ${totalShiftsMigrated}`);
    console.log(
      `   Total de registros: ${totalAssignmentsMigrated + totalShiftsMigrated}\n`,
    );

    if (totalAssignmentsMigrated + totalShiftsMigrated > 0) {
      console.log('✅ Migração concluída com sucesso!');
      console.log(
        '\n💡 Próximo passo: Execute o diagnóstico para confirmar 0 órfãos:',
      );
      console.log('   npx tsx scripts/diagnose-orphan-shift-assignments.ts\n');
    } else {
      console.log('ℹ️  Nenhum registro migrado (já estava correto).\n');
    }
  } catch (error) {
    console.error('\n❌ Erro fatal durante migração:', error);
    throw error;
  } finally {
    await publicPrisma.$disconnect();
  }
}

// Executar
migrateOrphans()
  .then(() => {
    console.log('✅ Script concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falhou:', error);
    process.exit(1);
  });
