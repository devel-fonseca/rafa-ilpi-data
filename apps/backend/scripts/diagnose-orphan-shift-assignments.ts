import { PrismaClient } from '@prisma/client';
import { FIXED_SHIFT_TEMPLATE_IDS } from '../prisma/seeds/shift-templates.seed';

// ──────────────────────────────────────────────────────────────────────────────
//  SCRIPT - Diagnóstico de Referências Órfãs em ShiftTemplateId
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Verifica referências órfãs de shiftTemplateId em todos os tenants
 *
 * CONTEXTO:
 * - Antes da migração para UUIDs fixos, templates eram criados com @default(uuid())
 * - Cada reset do banco gerava novos UUIDs, criando referências órfãs
 * - Este script identifica assignments e shifts apontando para IDs inexistentes
 *
 * USO:
 * npx tsx scripts/diagnose-orphan-shift-assignments.ts
 */

const publicPrisma = new PrismaClient();

interface OrphanRecord {
  shiftTemplateId: string;
  count: bigint;
}

async function diagnoseOrphans() {
  console.log('🔍 Diagnosticando referências órfãs de ShiftTemplateId...\n');

  try {
    // 1. Buscar todos os tenants ativos
    const tenants = await publicPrisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, schemaName: true },
      orderBy: { name: 'asc' },
    });

    if (tenants.length === 0) {
      console.log('⚠️  Nenhum tenant encontrado');
      return;
    }

    console.log(`📊 Analisando ${tenants.length} tenant(s)\n`);

    // 2. IDs válidos (UUIDs fixos do seed)
    const validIds = Object.values(FIXED_SHIFT_TEMPLATE_IDS);
    console.log('✅ IDs válidos (UUIDs fixos):');
    validIds.forEach((id, index) => {
      const type = Object.keys(FIXED_SHIFT_TEMPLATE_IDS)[index];
      console.log(`   ${index + 1}. ${id} (${type})`);
    });
    console.log();

    let totalOrphansFound = 0;

    // 3. Verificar cada tenant
    for (const tenant of tenants) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 Tenant: ${tenant.name}`);
      console.log(`   Schema: ${tenant.schemaName}`);
      console.log(`${'='.repeat(80)}\n`);

      const tenantClient = new PrismaClient({
        datasources: {
          db: {
            url: `${process.env.DATABASE_URL}?schema=${tenant.schemaName}`,
          },
        },
      });

      try {
        // 3.1. Verificar assignments órfãs
        const orphanAssignments = (await tenantClient.$queryRaw`
          SELECT "shiftTemplateId", COUNT(*) as count
          FROM weekly_schedule_pattern_assignments
          WHERE "shiftTemplateId" NOT IN (${validIds[0]}, ${validIds[1]}, ${validIds[2]}, ${validIds[3]}, ${validIds[4]})
          GROUP BY "shiftTemplateId"
          ORDER BY count DESC
        `) as OrphanRecord[];

        // 3.2. Verificar shifts órfãos
        const orphanShifts = (await tenantClient.$queryRaw`
          SELECT "shiftTemplateId", COUNT(*) as count
          FROM shifts
          WHERE "shiftTemplateId" NOT IN (${validIds[0]}, ${validIds[1]}, ${validIds[2]}, ${validIds[3]}, ${validIds[4]})
          AND "deletedAt" IS NULL
          GROUP BY "shiftTemplateId"
          ORDER BY count DESC
        `) as OrphanRecord[];

        // 3.3. Exibir resultados
        const hasOrphans =
          orphanAssignments.length > 0 || orphanShifts.length > 0;

        if (hasOrphans) {
          totalOrphansFound++;
          console.log('❌ ÓRFÃOS ENCONTRADOS:\n');

          if (orphanAssignments.length > 0) {
            console.log(
              '   📌 Weekly Schedule Pattern Assignments (padrão semanal):',
            );
            orphanAssignments.forEach((record) => {
              console.log(
                `      - ${record.shiftTemplateId}: ${record.count} registro(s)`,
              );
            });
            console.log();
          }

          if (orphanShifts.length > 0) {
            console.log('   📌 Shifts (plantões concretos):');
            orphanShifts.forEach((record) => {
              console.log(
                `      - ${record.shiftTemplateId}: ${record.count} registro(s)`,
              );
            });
            console.log();
          }

          // Total de registros órfãos neste tenant
          const totalAssignments = orphanAssignments.reduce(
            (sum, r) => sum + Number(r.count),
            0,
          );
          const totalShifts = orphanShifts.reduce(
            (sum, r) => sum + Number(r.count),
            0,
          );
          console.log(
            `   📊 Total: ${totalAssignments} assignment(s) + ${totalShifts} shift(s) = ${totalAssignments + totalShifts} órfãos\n`,
          );
        } else {
          console.log('✅ Nenhum órfão encontrado neste tenant\n');
        }
      } catch (error) {
        console.error(
          `❌ Erro ao processar tenant ${tenant.tradeName}:`,
          error.message,
        );
      } finally {
        await tenantClient.$disconnect();
      }
    }

    // 4. Resumo final
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 RESUMO FINAL');
    console.log(`${'='.repeat(80)}\n`);

    if (totalOrphansFound === 0) {
      console.log('✅ Nenhum tenant com referências órfãs!');
      console.log(
        '   Todos os shiftTemplateIds apontam para UUIDs válidos.\n',
      );
    } else {
      console.log(
        `⚠️  ${totalOrphansFound} tenant(s) com referências órfãs encontradas`,
      );
      console.log(
        '\n💡 Próximo passo: Execute o script de migração para corrigir:',
      );
      console.log('   npx tsx scripts/migrate-orphan-shift-assignments.ts\n');
    }
  } catch (error) {
    console.error('❌ Erro fatal:', error);
    throw error;
  } finally {
    await publicPrisma.$disconnect();
  }
}

// Executar
diagnoseOrphans()
  .then(() => {
    console.log('✅ Diagnóstico concluído com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Diagnóstico falhou:', error);
    process.exit(1);
  });
