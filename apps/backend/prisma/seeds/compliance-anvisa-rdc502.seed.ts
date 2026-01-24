import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Seed para Questões de Conformidade ANVISA - RDC 502/2021
 *
 * Insere no banco de dados:
 * - 1 versão da regulamentação (ComplianceQuestionVersion)
 * - 37 questões oficiais do Roteiro de Inspeção ILPI (ComplianceQuestion)
 *
 * Fonte: docs/ideias/roteiro_inspecao_ilpi_anvisa.md
 * JSON gerado: prisma/seeds/data/rdc-502-2021.json
 */

interface ResponseOption {
  points: number;
  text: string;
  isNA: boolean;
}

interface Question {
  questionNumber: number;
  questionText: string;
  criticalityLevel: 'C' | 'NC';
  legalReference: string;
  category: string;
  responseOptions: ResponseOption[];
}

interface RDCData {
  regulationName: string;
  versionNumber: number;
  effectiveDate: string;
  description: string;
  documentVersion: string;
  documentDate: string;
  questions: Question[];
}

export async function seedComplianceAnvisaRDC502(prisma: PrismaClient) {
  console.log('\n🏥 [Compliance ANVISA] Iniciando seed RDC 502/2021...\n');

  // Ler dados do JSON
  const jsonPath = path.join(__dirname, 'data/rdc-502-2021.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`❌ Arquivo JSON não encontrado: ${jsonPath}`);
  }

  const rdcData: RDCData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`✅ JSON lido: ${rdcData.questions.length} questões`);

  // ═══════════════════════════════════════════════════════════════════════
  // 1. Criar/Atualizar Versão da Regulamentação
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n📋 Criando versão da regulamentação...');

  const version = await prisma.complianceQuestionVersion.upsert({
    where: {
      regulationName_versionNumber: {
        regulationName: rdcData.regulationName,
        versionNumber: rdcData.versionNumber,
      },
    },
    create: {
      regulationName: rdcData.regulationName,
      versionNumber: rdcData.versionNumber,
      effectiveDate: new Date(rdcData.effectiveDate),
      expiresAt: null, // Versão atual, sem data de expiração
      description: rdcData.description,
      createdBy: '10000000-0000-4000-8000-000000000010', // UUID fixo para seed de compliance ANVISA
    },
    update: {
      description: rdcData.description,
      effectiveDate: new Date(rdcData.effectiveDate),
    },
  });

  console.log(`✅ Versão criada: ${version.regulationName} v${version.versionNumber}`);
  console.log(`   ID: ${version.id}`);
  console.log(`   Descrição: ${version.description}`);

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Inserir Questões
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n📝 Inserindo questões...\n');

  let inserted = 0;
  let updated = 0;

  for (const question of rdcData.questions) {
    const existing = await prisma.complianceQuestion.findUnique({
      where: {
        versionId_questionNumber: {
          versionId: version.id,
          questionNumber: question.questionNumber,
        },
      },
    });

    if (existing) {
      // Atualizar questão existente (caso tenha mudado)
      await prisma.complianceQuestion.update({
        where: { id: existing.id },
        data: {
          questionText: question.questionText,
          criticalityLevel: question.criticalityLevel,
          legalReference: question.legalReference,
          category: question.category,
          responseOptions: question.responseOptions as any,
        },
      });
      updated++;
      console.log(`   🔄 Q${question.questionNumber}: ${question.questionText} (atualizada)`);
    } else {
      // Criar nova questão
      await prisma.complianceQuestion.create({
        data: {
          versionId: version.id,
          questionNumber: question.questionNumber,
          questionText: question.questionText,
          criticalityLevel: question.criticalityLevel,
          legalReference: question.legalReference,
          category: question.category,
          responseOptions: question.responseOptions as any,
        },
      });
      inserted++;
      console.log(`   ✅ Q${question.questionNumber}: ${question.questionText} (${question.criticalityLevel})`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Resumo Final
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n📊 Resumo do Seed:');
  console.log(`   Regulamentação: ${version.regulationName} v${version.versionNumber}`);
  console.log(`   Questões inseridas: ${inserted}`);
  console.log(`   Questões atualizadas: ${updated}`);
  console.log(`   Total: ${inserted + updated}`);

  // Validar contagem final
  const totalQuestions = await prisma.complianceQuestion.count({
    where: { versionId: version.id },
  });

  if (totalQuestions !== 37) {
    console.warn(`\n⚠️  ATENÇÃO: Esperadas 37 questões, encontradas ${totalQuestions} no banco!`);
  } else {
    console.log('\n✅ Validação: 37 questões confirmadas no banco de dados');
  }

  // Estatísticas por categoria
  const categories = await prisma.complianceQuestion.groupBy({
    by: ['category'],
    where: { versionId: version.id },
    _count: { id: true },
  });

  console.log('\n📈 Distribuição por Categoria:');
  categories
    .sort((a, b) => b._count.id - a._count.id)
    .forEach(cat => {
      console.log(`   ${cat.category}: ${cat._count.id} questões`);
    });

  // Estatísticas por criticidade
  const critical = await prisma.complianceQuestion.count({
    where: { versionId: version.id, criticalityLevel: 'C' },
  });
  const nonCritical = await prisma.complianceQuestion.count({
    where: { versionId: version.id, criticalityLevel: 'NC' },
  });

  console.log('\n🔴 Criticidade:');
  console.log(`   Críticas (C): ${critical}`);
  console.log(`   Não Críticas (NC): ${nonCritical}`);

  console.log('\n✅ Seed de Compliance ANVISA concluído com sucesso!\n');
}

// Executar seed diretamente se chamado como script
if (require.main === module) {
  const prisma = new PrismaClient();

  seedComplianceAnvisaRDC502(prisma)
    .then(() => {
      console.log('✅ Seed executado com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro ao executar seed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
