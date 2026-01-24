#!/usr/bin/env ts-node
/**
 * Script de Extração de Questões RDC 502/2021
 *
 * Extrai os 37 indicadores do Roteiro Objetivo de Inspeção ILPI (ANVISA)
 * a partir do arquivo Markdown e gera JSON estruturado para seed.
 *
 * Fonte: docs/ideias/roteiro_inspecao_ilpi_anvisa.md
 * Documento Oficial: ANVISA - Doc 11.1, Versão 1.2, 05/12/2022
 *
 * Uso: npx ts-node apps/backend/scripts/extract-rdc-questions.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface ResponseOption {
  points: number; // 0-5
  text: string;
  isNA: boolean; // Sempre false para RDC (não há opção N/A)
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
  effectiveDate: string; // ISO date
  description: string;
  documentVersion: string; // "1.2"
  documentDate: string; // "05/12/2022"
  questions: Question[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIAS (baseadas na análise do roteiro)
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORIES: Record<number, string> = {
  // Documentação e Regularização (Q1-Q6)
  1: 'Documentação e Regularização',
  2: 'Documentação e Regularização',
  3: 'Documentação e Regularização',
  4: 'Documentação e Regularização',
  5: 'Documentação e Regularização',
  6: 'Documentação e Regularização',

  // Recursos Humanos (Q7-Q9)
  7: 'Recursos Humanos',
  8: 'Recursos Humanos',
  9: 'Recursos Humanos',

  // Infraestrutura Física (Q10-Q24)
  10: 'Infraestrutura Física',
  11: 'Infraestrutura Física',
  12: 'Infraestrutura Física',
  13: 'Infraestrutura Física',
  14: 'Infraestrutura Física',
  15: 'Infraestrutura Física',
  16: 'Infraestrutura Física',
  17: 'Infraestrutura Física',
  18: 'Infraestrutura Física',
  19: 'Infraestrutura Física',
  20: 'Infraestrutura Física',
  21: 'Infraestrutura Física',
  22: 'Infraestrutura Física',
  23: 'Infraestrutura Física',
  24: 'Infraestrutura Física',

  // Assistência e Cuidado (Q25-Q32)
  25: 'Assistência e Cuidado',
  26: 'Assistência e Cuidado',
  27: 'Assistência e Cuidado',
  28: 'Assistência e Cuidado',
  29: 'Assistência e Cuidado',
  30: 'Assistência e Cuidado',
  31: 'Assistência e Cuidado',
  32: 'Assistência e Cuidado',

  // Gestão e Qualidade (Q33-Q37)
  33: 'Gestão e Qualidade',
  34: 'Gestão e Qualidade',
  35: 'Gestão e Qualidade',
  36: 'Gestão e Qualidade',
  37: 'Gestão e Qualidade',
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE EXTRAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extrai indicadores do Markdown
 */
function extractQuestions(markdownContent: string): Question[] {
  const questions: Question[] = [];

  // Regex para capturar cada seção de indicador
  // Formato: ### N. Nome do Indicador
  const indicatorRegex = /### (\d+)\. (.+?)\n\n\| Campo \| Detalhes \|[\s\S]*?\*\*Nº\*\* \| (\d+) \|[\s\S]*?\*\*Indicador\*\* \| (.+?) \|[\s\S]*?\*\*Crítica\*\* \| (C|NC) \|[\s\S]*?\*\*Marco Regulatório\*\* \| (.+?) \|[\s\S]*?\*\*Escala de Avaliação:\*\*\n\n([\s\S]*?)(?=###|$)/g;

  let match;
  while ((match = indicatorRegex.exec(markdownContent)) !== null) {
    const [, headerNum, headerName, tableNum, tableName, criticality, legalRef, scaleSection] = match;

    const questionNumber = parseInt(tableNum, 10);

    // Extrair opções de resposta da escala
    const responseOptions = extractResponseOptions(scaleSection);

    if (responseOptions.length !== 6) {
      console.warn(`⚠️  Questão ${questionNumber}: Esperadas 6 opções, encontradas ${responseOptions.length}`);
    }

    questions.push({
      questionNumber,
      questionText: tableName.trim(),
      criticalityLevel: criticality as 'C' | 'NC',
      legalReference: legalRef.trim(),
      category: CATEGORIES[questionNumber] || 'Sem Categoria',
      responseOptions,
    });
  }

  return questions.sort((a, b) => a.questionNumber - b.questionNumber);
}

/**
 * Extrai opções de resposta da seção de escala de avaliação
 */
function extractResponseOptions(scaleSection: string): ResponseOption[] {
  const options: ResponseOption[] = [];

  // Regex para capturar linhas da tabela de pontos
  // Formato: | **0** | Texto da situação. |
  const optionRegex = /\| \*\*(\d+)\*\* \| (.+?) \|/g;

  let match;
  while ((match = optionRegex.exec(scaleSection)) !== null) {
    const [, pointsStr, text] = match;
    const points = parseInt(pointsStr, 10);

    options.push({
      points,
      text: text.trim(),
      isNA: false, // RDC não possui opção N/A (diferente do HTML original)
    });
  }

  return options.sort((a, b) => a.points - b.points);
}

/**
 * Valida estrutura dos dados extraídos
 */
function validateQuestions(questions: Question[]): void {
  console.log('\n🔍 Validando dados extraídos...\n');

  const errors: string[] = [];

  // Validar quantidade total
  if (questions.length !== 37) {
    errors.push(`❌ Esperadas 37 questões, encontradas ${questions.length}`);
  } else {
    console.log('✅ Quantidade de questões: 37');
  }

  // Validar numeração sequencial
  for (let i = 1; i <= 37; i++) {
    const question = questions.find(q => q.questionNumber === i);
    if (!question) {
      errors.push(`❌ Questão ${i} não encontrada`);
    }
  }
  if (errors.length === 0) {
    console.log('✅ Numeração sequencial: 1-37');
  }

  // Validar cada questão
  questions.forEach(q => {
    // Criticidade deve ser C ou NC
    if (q.criticalityLevel !== 'C' && q.criticalityLevel !== 'NC') {
      errors.push(`❌ Q${q.questionNumber}: Criticidade inválida "${q.criticalityLevel}"`);
    }

    // Deve ter exatamente 6 opções (0-5 pontos)
    if (q.responseOptions.length !== 6) {
      errors.push(`❌ Q${q.questionNumber}: Esperadas 6 opções, encontradas ${q.responseOptions.length}`);
    }

    // Opções devem ter pontos de 0 a 5
    const points = q.responseOptions.map(o => o.points).sort((a, b) => a - b);
    const expectedPoints = [0, 1, 2, 3, 4, 5];
    if (JSON.stringify(points) !== JSON.stringify(expectedPoints)) {
      errors.push(`❌ Q${q.questionNumber}: Pontos inválidos ${JSON.stringify(points)}`);
    }

    // Nenhuma opção deve ser N/A (RDC não possui)
    const hasNA = q.responseOptions.some(o => o.isNA);
    if (hasNA) {
      errors.push(`❌ Q${q.questionNumber}: Opção N/A encontrada (não deveria existir)`);
    }
  });

  if (errors.length === 0) {
    console.log('✅ Criticidade: C ou NC');
    console.log('✅ Opções de resposta: 6 por questão (pontos 0-5)');
    console.log('✅ Sem opções N/A (correto para RDC)');
  }

  // Validar distribuição por categoria
  const categoryCounts: Record<string, number> = {};
  questions.forEach(q => {
    categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
  });

  console.log('\n📊 Distribuição por categoria:');
  Object.entries(categoryCounts).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} questões`);
  });

  // Validar criticidade
  const criticalCount = questions.filter(q => q.criticalityLevel === 'C').length;
  const nonCriticalCount = questions.filter(q => q.criticalityLevel === 'NC').length;
  console.log(`\n🔴 Críticas (C): ${criticalCount}`);
  console.log(`🟡 Não Críticas (NC): ${nonCriticalCount}`);

  // Exibir erros
  if (errors.length > 0) {
    console.error('\n❌ ERROS ENCONTRADOS:\n');
    errors.forEach(err => console.error(err));
    process.exit(1);
  }

  console.log('\n✅ Validação concluída com sucesso!\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🚀 Extração de Questões RDC 502/2021 - Roteiro ANVISA\n');

  // Paths
  const projectRoot = path.resolve(__dirname, '../../..');
  const markdownPath = path.join(projectRoot, 'docs/ideias/roteiro_inspecao_ilpi_anvisa.md');
  const outputPath = path.join(__dirname, '../prisma/seeds/data/rdc-502-2021.json');

  console.log(`📂 Lendo arquivo: ${markdownPath}\n`);

  // Ler arquivo Markdown
  if (!fs.existsSync(markdownPath)) {
    console.error(`❌ Arquivo não encontrado: ${markdownPath}`);
    process.exit(1);
  }

  const markdownContent = fs.readFileSync(markdownPath, 'utf-8');
  console.log(`✅ Arquivo lido: ${markdownContent.length} caracteres\n`);

  // Extrair questões
  console.log('🔨 Extraindo questões...\n');
  const questions = extractQuestions(markdownContent);
  console.log(`✅ ${questions.length} questões extraídas\n`);

  // Validar
  validateQuestions(questions);

  // Montar objeto final
  const rdcData: RDCData = {
    regulationName: 'RDC 502/2021',
    versionNumber: 1,
    effectiveDate: '2021-08-01', // Data de publicação da RDC 502
    description: 'Versão 1.2 do Roteiro Objetivo de Inspeção ILPI (ANVISA - 05/12/2022)',
    documentVersion: '1.2',
    documentDate: '05/12/2022',
    questions,
  };

  // Criar diretório de saída se não existir
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Salvar JSON
  fs.writeFileSync(outputPath, JSON.stringify(rdcData, null, 2), 'utf-8');
  console.log(`💾 JSON gerado: ${outputPath}\n`);

  // Estatísticas finais
  console.log('📈 Estatísticas Finais:');
  console.log(`   Total de questões: ${questions.length}`);
  console.log(`   Total de opções: ${questions.reduce((acc, q) => acc + q.responseOptions.length, 0)}`);
  console.log(`   Tamanho do JSON: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

  console.log('\n✅ Extração concluída com sucesso!');
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
