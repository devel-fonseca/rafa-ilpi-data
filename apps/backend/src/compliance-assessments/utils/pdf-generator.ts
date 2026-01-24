import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import { AssessmentResultDto } from '../dto';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Tipo para não conformidades críticas
 */
interface CriticalNonCompliant {
  questionNumber: number;
  questionText: string;
  pointsObtained: number;
}

/**
 * Gerador de PDF para relatórios de autodiagnóstico RDC 502/2021
 */
export class CompliancePDFGenerator {
  /**
   * Gera PDF do relatório de autodiagnóstico
   */
  static async generatePDF(
    assessment: AssessmentResultDto,
    tenantName: string,
  ): Promise<Buffer> {
    // Criar documento PDF
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Adicionar página
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    const margin = 50;
    let yPosition = height - margin;

    // Cores
    const primaryColor = rgb(0.2, 0.4, 0.7); // Azul
    const grayColor = rgb(0.5, 0.5, 0.5); // Cinza

    // Título
    page.drawText('AUTODIAGNÓSTICO DE CONFORMIDADE', {
      x: margin,
      y: yPosition,
      size: 18,
      font: timesRomanBold,
      color: primaryColor,
    });
    yPosition -= 20;

    page.drawText('RDC 502/2021 - ANVISA', {
      x: margin,
      y: yPosition,
      size: 14,
      font: timesRomanBold,
      color: primaryColor,
    });
    yPosition -= 40;

    // Informações gerais
    this.drawSection(page, timesRomanBold, 'INFORMAÇÕES GERAIS', margin, yPosition, 12);
    yPosition -= 25;

    this.drawField(
      page,
      timesRomanFont,
      'Instituição:',
      tenantName,
      margin,
      yPosition,
      10,
    );
    yPosition -= 18;

    this.drawField(
      page,
      timesRomanFont,
      'Data da Avaliação:',
      format(new Date(assessment.assessmentDate), "dd 'de' MMMM 'de' yyyy", {
        locale: ptBR,
      }),
      margin,
      yPosition,
      10,
    );
    yPosition -= 18;

    this.drawField(
      page,
      timesRomanFont,
      'Status:',
      assessment.status,
      margin,
      yPosition,
      10,
    );
    yPosition -= 35;

    // Resultados
    this.drawSection(page, timesRomanBold, 'RESULTADOS DA AVALIAÇÃO', margin, yPosition, 12);
    yPosition -= 25;

    // Box de pontuação
    const boxHeight = 80;
    page.drawRectangle({
      x: margin,
      y: yPosition - boxHeight,
      width: width - 2 * margin,
      height: boxHeight,
      borderColor: primaryColor,
      borderWidth: 2,
    });

    // Percentual de conformidade (centralizado)
    const percentText = `${assessment.compliancePercentage}%`;
    page.drawText(percentText, {
      x: width / 2 - 40,
      y: yPosition - 35,
      size: 32,
      font: timesRomanBold,
      color: this.getColorByLevel(assessment.complianceLevel),
    });

    page.drawText(assessment.complianceLevel, {
      x: width / 2 - 35,
      y: yPosition - 55,
      size: 14,
      font: timesRomanBold,
      color: this.getColorByLevel(assessment.complianceLevel),
    });

    yPosition -= boxHeight + 20;

    // Métricas
    this.drawField(
      page,
      timesRomanFont,
      'Questões Respondidas:',
      `${assessment.questionsAnswered}/${assessment.totalQuestions}`,
      margin,
      yPosition,
      10,
    );
    yPosition -= 18;

    this.drawField(
      page,
      timesRomanFont,
      'Questões Aplicáveis:',
      `${assessment.applicableQuestions} (${assessment.questionsNA} marcadas como N/A)`,
      margin,
      yPosition,
      10,
    );
    yPosition -= 18;

    this.drawField(
      page,
      timesRomanFont,
      'Pontos Obtidos:',
      `${assessment.totalPointsObtained} de ${assessment.totalPointsPossible}`,
      margin,
      yPosition,
      10,
    );
    yPosition -= 35;

    // Não conformidades críticas
    if (
      assessment.criticalNonCompliant &&
      Array.isArray(assessment.criticalNonCompliant) &&
      assessment.criticalNonCompliant.length > 0
    ) {
      this.drawSection(
        page,
        timesRomanBold,
        `NÃO CONFORMIDADES CRÍTICAS (${assessment.criticalNonCompliant.length})`,
        margin,
        yPosition,
        12,
      );
      yPosition -= 25;

      assessment.criticalNonCompliant.slice(0, 5).forEach((nc: CriticalNonCompliant) => {
        page.drawText(`• Q${nc.questionNumber}: ${nc.questionText}`, {
          x: margin + 10,
          y: yPosition,
          size: 9,
          font: timesRomanFont,
          color: rgb(0.8, 0, 0), // Vermelho
        });
        yPosition -= 15;
      });

      if (assessment.criticalNonCompliant.length > 5) {
        page.drawText(`... e mais ${assessment.criticalNonCompliant.length - 5} item(ns)`, {
          x: margin + 10,
          y: yPosition,
          size: 9,
          font: timesRomanFont,
          color: grayColor,
        });
        yPosition -= 20;
      } else {
        yPosition -= 5;
      }
    }

    // Rodapé
    page.drawText('Documento gerado automaticamente pelo Sistema Rafa ILPI', {
      x: margin,
      y: 30,
      size: 8,
      font: timesRomanFont,
      color: grayColor,
    });

    page.drawText(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, {
      x: margin,
      y: 18,
      size: 8,
      font: timesRomanFont,
      color: grayColor,
    });

    // Salvar PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Desenha seção
   */
  private static drawSection(
    page: PDFPage,
    font: PDFFont,
    text: string,
    x: number,
    y: number,
    size: number,
  ) {
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0.2, 0.4, 0.7),
    });
  }

  /**
   * Desenha campo (label: valor)
   */
  private static drawField(
    page: PDFPage,
    font: PDFFont,
    label: string,
    value: string,
    x: number,
    y: number,
    size: number,
  ) {
    page.drawText(`${label} ${value}`, {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  }

  /**
   * Retorna cor baseada no nível de conformidade
   */
  private static getColorByLevel(level: string) {
    switch (level) {
      case 'REGULAR':
        return rgb(0, 0.6, 0); // Verde
      case 'PARCIAL':
        return rgb(1, 0.6, 0); // Laranja
      case 'IRREGULAR':
        return rgb(0.8, 0, 0); // Vermelho
      default:
        return rgb(0.5, 0.5, 0.5); // Cinza
    }
  }
}
