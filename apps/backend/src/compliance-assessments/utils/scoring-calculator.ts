/**
 * Utilitário para cálculo de pontuação de conformidade RDC 502/2021
 *
 * Algoritmo baseado no Roteiro Objetivo de Inspeção ILPI da ANVISA:
 * - Pontuação: 0-5 pontos por questão
 * - Critério de conformidade:
 *   - 0-2 pontos: Não conforme (requer ação corretiva)
 *   - 3 pontos: Conforme (Regular)
 *   - 4 pontos: Ótimo
 *   - 5 pontos: Excelente
 * - Questões podem ser marcadas como N/A (Não Aplicável)
 * - Pontuação possível = (questões aplicáveis) × 3 pontos
 * - % conformidade = (pontos obtidos / pontos possíveis) × 100
 * - Classificação final:
 *   - REGULAR: ≥75%
 *   - PARCIAL: 50-74%
 *   - IRREGULAR: <50%
 */

import { ComplianceLevel } from '../dto/query-assessment.dto';

/**
 * Resposta de uma questão (formato simplificado para cálculo)
 */
export interface AssessmentResponseForScoring {
  questionNumber: number;
  questionText?: string;
  criticalityLevel: string; // 'C' ou 'NC'
  selectedPoints?: number; // 0-5 ou null
  isNotApplicable: boolean;
}

/**
 * Resultado do cálculo de pontuação
 */
export interface ScoringResult {
  totalQuestions: number;
  questionsAnswered: number;
  questionsNA: number;
  applicableQuestions: number;
  totalPointsObtained: number;
  totalPointsPossible: number;
  compliancePercentage: number;
  complianceLevel: ComplianceLevel;
  criticalNonCompliant: Array<{
    questionNumber: number;
    questionText: string;
    pointsObtained: number;
  }>;
}

/**
 * Calcula a pontuação total e classificação de conformidade
 */
export function calculateScoring(
  responses: AssessmentResponseForScoring[],
  totalQuestions: number = 37,
): ScoringResult {
  // Contar questões respondidas e N/A
  const questionsAnswered = responses.filter(
    (r) => r.selectedPoints !== null && r.selectedPoints !== undefined || r.isNotApplicable,
  ).length;

  const questionsNA = responses.filter((r) => r.isNotApplicable).length;

  // Questões aplicáveis = total - N/A
  const applicableQuestions = totalQuestions - questionsNA;

  // Somar pontos obtidos (apenas questões aplicáveis)
  const totalPointsObtained = responses
    .filter((r) => !r.isNotApplicable && r.selectedPoints !== null && r.selectedPoints !== undefined)
    .reduce((sum, r) => sum + (r.selectedPoints || 0), 0);

  // Pontuação possível = questões aplicáveis × 3 pontos
  // (Nota: No HTML original, a pontuação máxima por questão é considerada 3, não 5)
  const totalPointsPossible = applicableQuestions * 3;

  // Calcular percentual de conformidade
  const compliancePercentage =
    totalPointsPossible > 0 ? (totalPointsObtained / totalPointsPossible) * 100 : 0;

  // Classificar nível de conformidade
  const complianceLevel = classifyComplianceLevel(compliancePercentage);

  // Identificar não conformidades críticas (C com pontuação < 3)
  const criticalNonCompliant = responses
    .filter(
      (r) =>
        r.criticalityLevel === 'C' &&
        !r.isNotApplicable &&
        (r.selectedPoints === null || r.selectedPoints === undefined || r.selectedPoints < 3),
    )
    .map((r) => ({
      questionNumber: r.questionNumber,
      questionText: r.questionText || '',
      pointsObtained: r.selectedPoints ?? 0,
    }));

  return {
    totalQuestions,
    questionsAnswered,
    questionsNA,
    applicableQuestions,
    totalPointsObtained,
    totalPointsPossible,
    compliancePercentage: Math.round(compliancePercentage * 100) / 100, // 2 casas decimais
    complianceLevel,
    criticalNonCompliant,
  };
}

/**
 * Classifica o nível de conformidade com base no percentual
 */
export function classifyComplianceLevel(percentage: number): ComplianceLevel {
  if (percentage >= 75) {
    return ComplianceLevel.REGULAR;
  } else if (percentage >= 50) {
    return ComplianceLevel.PARCIAL;
  } else {
    return ComplianceLevel.IRREGULAR;
  }
}

/**
 * Calcula estatísticas por categoria
 */
export interface CategoryStats {
  category: string;
  totalQuestions: number;
  questionsAnswered: number;
  pointsObtained: number;
  pointsPossible: number;
  percentage: number;
}

export function calculateCategoryStats(
  responses: Array<
    AssessmentResponseForScoring & {
      category?: string;
    }
  >,
): CategoryStats[] {
  // Agrupar respostas por categoria
  const categoriesMap = new Map<string, typeof responses>();

  responses.forEach((r) => {
    const category = r.category || 'Sem Categoria';
    if (!categoriesMap.has(category)) {
      categoriesMap.set(category, []);
    }
    categoriesMap.get(category)!.push(r);
  });

  // Calcular estatísticas para cada categoria
  const stats: CategoryStats[] = [];

  categoriesMap.forEach((categoryResponses, category) => {
    const totalQuestions = categoryResponses.length;
    const questionsAnswered = categoryResponses.filter(
      (r) => r.selectedPoints !== null && r.selectedPoints !== undefined || r.isNotApplicable,
    ).length;

    const applicableQuestions = categoryResponses.filter((r) => !r.isNotApplicable).length;

    const pointsObtained = categoryResponses
      .filter((r) => !r.isNotApplicable && r.selectedPoints !== null && r.selectedPoints !== undefined)
      .reduce((sum, r) => sum + (r.selectedPoints || 0), 0);

    const pointsPossible = applicableQuestions * 3;

    const percentage = pointsPossible > 0 ? (pointsObtained / pointsPossible) * 100 : 0;

    stats.push({
      category,
      totalQuestions,
      questionsAnswered,
      pointsObtained,
      pointsPossible,
      percentage: Math.round(percentage * 100) / 100,
    });
  });

  // Ordenar por categoria (alfabeticamente)
  return stats.sort((a, b) => a.category.localeCompare(b.category));
}
