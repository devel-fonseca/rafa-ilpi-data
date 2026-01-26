/**
 * Script de Migração: ServiceContract → TermsOfService
 *
 * Este script migra dados da tabela antiga `service_contracts` para a nova
 * tabela `terms_of_service`, e os aceites de `contract_acceptances` para
 * `terms_of_service_acceptances`.
 *
 * IMPORTANTE:
 * - Execute este script APENAS UMA VEZ em produção
 * - Faça backup do banco antes de executar
 * - O script é idempotente (pode rodar múltiplas vezes sem duplicar dados)
 *
 * Uso:
 *   npx ts-node scripts/migrate-contracts-to-terms.ts
 *   npx ts-node scripts/migrate-contracts-to-terms.ts --dry-run  # Simula sem salvar
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface MigrationStats {
  contractsMigrated: number
  contractsSkipped: number
  acceptancesMigrated: number
  acceptancesSkipped: number
  errors: string[]
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.log('🔄 Iniciando migração: ServiceContract → TermsOfService')
  console.log(`📋 Modo: ${isDryRun ? 'DRY RUN (simulação)' : 'PRODUÇÃO'}`)
  console.log('━'.repeat(60))

  const stats: MigrationStats = {
    contractsMigrated: 0,
    contractsSkipped: 0,
    acceptancesMigrated: 0,
    acceptancesSkipped: 0,
    errors: [],
  }

  try {
    // 1️⃣ Migrar ServiceContract → TermsOfService
    console.log('\n1️⃣  Migrando contratos...')

    const oldContracts = await prisma.serviceContract.findMany({
      include: {
        acceptances: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    console.log(`   Encontrados: ${oldContracts.length} contratos`)

    for (const oldContract of oldContracts) {
      try {
        // Verificar se já existe termo com mesma versão e planId
        const existing = await prisma.termsOfService.findFirst({
          where: {
            version: oldContract.version,
            planId: oldContract.planId,
          },
        })

        if (existing) {
          console.log(
            `   ⏭️  SKIP: Termo já existe (versão ${oldContract.version}, planId ${oldContract.planId})`,
          )
          stats.contractsSkipped++
          continue
        }

        if (!isDryRun) {
          await prisma.termsOfService.create({
            data: {
              id: oldContract.id, // Mantém o mesmo ID para facilitar migração de aceites
              version: oldContract.version,
              planId: oldContract.planId,
              status: oldContract.status,
              effectiveFrom: oldContract.effectiveFrom,
              title: oldContract.title,
              content: oldContract.content,
              contentHash: oldContract.contentHash,
              createdBy: oldContract.createdBy,
              createdAt: oldContract.createdAt,
              updatedAt: oldContract.updatedAt,
              revokedAt: oldContract.revokedAt,
              revokedBy: oldContract.revokedBy,
            },
          })
        }

        console.log(
          `   ✅ Migrado: ${oldContract.version} (${oldContract.status}) - ${oldContract.acceptances.length} aceites`,
        )
        stats.contractsMigrated++
      } catch (error) {
        const errorMsg = `Erro ao migrar contrato ${oldContract.id}: ${error.message}`
        console.error(`   ❌ ${errorMsg}`)
        stats.errors.push(errorMsg)
      }
    }

    // 2️⃣ Migrar ContractAcceptance → TermsOfServiceAcceptance
    console.log('\n2️⃣  Migrando aceites de contratos...')

    const oldAcceptances = await prisma.contractAcceptance.findMany({
      orderBy: {
        acceptedAt: 'asc',
      },
    })

    console.log(`   Encontrados: ${oldAcceptances.length} aceites`)

    for (const oldAcceptance of oldAcceptances) {
      try {
        // Verificar se já existe aceite para este tenant
        const existing = await prisma.termsOfServiceAcceptance.findUnique({
          where: {
            tenantId: oldAcceptance.tenantId,
          },
        })

        if (existing) {
          console.log(
            `   ⏭️  SKIP: Aceite já existe para tenant ${oldAcceptance.tenantId}`,
          )
          stats.acceptancesSkipped++
          continue
        }

        if (!isDryRun) {
          await prisma.termsOfServiceAcceptance.create({
            data: {
              id: oldAcceptance.id, // Mantém o mesmo ID
              termsId: oldAcceptance.contractId, // contractId vira termsId
              tenantId: oldAcceptance.tenantId,
              userId: oldAcceptance.userId,
              acceptedAt: oldAcceptance.acceptedAt,
              ipAddress: oldAcceptance.ipAddress,
              userAgent: oldAcceptance.userAgent,
              termsVersion: oldAcceptance.contractVersion,
              termsHash: oldAcceptance.contractHash,
              termsContent: oldAcceptance.contractContent,
            },
          })
        }

        console.log(`   ✅ Migrado: aceite do tenant ${oldAcceptance.tenantId}`)
        stats.acceptancesMigrated++
      } catch (error) {
        const errorMsg = `Erro ao migrar aceite ${oldAcceptance.id}: ${error.message}`
        console.error(`   ❌ ${errorMsg}`)
        stats.errors.push(errorMsg)
      }
    }

    // 📊 Estatísticas finais
    console.log('\n' + '━'.repeat(60))
    console.log('📊 Estatísticas da Migração:')
    console.log('━'.repeat(60))
    console.log(`   Contratos migrados:        ${stats.contractsMigrated}`)
    console.log(`   Contratos já existentes:   ${stats.contractsSkipped}`)
    console.log(`   Aceites migrados:          ${stats.acceptancesMigrated}`)
    console.log(`   Aceites já existentes:     ${stats.acceptancesSkipped}`)
    console.log(`   Erros:                     ${stats.errors.length}`)

    if (stats.errors.length > 0) {
      console.log('\n❌ Erros encontrados:')
      stats.errors.forEach((error) => console.log(`   - ${error}`))
    }

    if (isDryRun) {
      console.log('\n⚠️  DRY RUN: Nenhuma alteração foi salva no banco')
    } else {
      console.log('\n✅ Migração concluída com sucesso!')
      console.log(
        '\n⚠️  PRÓXIMOS PASSOS (execute manualmente após validar):',
      )
      console.log('   1. Validar dados migrados no banco')
      console.log('   2. Testar funcionalidades no frontend')
      console.log(
        '   3. Criar backup antes de deletar tabelas antigas (IMPORTANTE!)',
      )
      console.log('   4. Deletar tabelas antigas:')
      console.log('      DROP TABLE contract_acceptances CASCADE;')
      console.log('      DROP TABLE service_contracts CASCADE;')
    }
  } catch (error) {
    console.error('\n💥 Erro fatal durante migração:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
