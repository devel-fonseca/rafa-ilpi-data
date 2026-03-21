import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RdcIndicatorType, RDC_INDICATOR_LABELS } from '@/types/incidents';
import { getMonthlyIndicatorStatus } from '@/utils/monthlyIndicatorStatus';

interface IndicatorData {
  numerator: number;
  denominator: number;
  rate: number;
  incidentIds: string[];
  calculatedAt: string;
  populationReferenceDate?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface IndicatorsByMonth {
  [indicatorType: string]: IndicatorData;
}

interface HistoricalIndicator {
  year: number;
  month: number;
  indicators: {
    [indicatorType: string]: {
      numerator: number;
      denominator: number;
      rate: number;
      calculatedAt: string;
    };
  };
}

interface ExportOptions {
  year: number;
  month: number;
  indicators: IndicatorsByMonth;
  history?: HistoricalIndicator[];
  ilpiName?: string;
  cnpj?: string;
  cnes?: string;
  tenantName?: string;
  generatedBy?: string;
  printDateTime?: string;
}

interface PopulationProfileByDependency {
  dependencyLevel: 'GRAU_I' | 'GRAU_II' | 'GRAU_III' | 'SEM_AVALIACAO';
  total: number;
  female: number;
  male: number;
  other: number;
  percentage: number;
}

interface PopulationProfileSnapshot {
  referenceDate: string;
  totalResidents: number;
  byDependency: PopulationProfileByDependency[];
}

function formatDateOnlyBr(dateOnly: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!match) return dateOnly;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatPercentage(value: number, fractionDigits: number): string {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)}%`;
}

function getDependencyLevelLabel(value: PopulationProfileByDependency['dependencyLevel']): string {
  const labels: Record<PopulationProfileByDependency['dependencyLevel'], string> = {
    GRAU_I: 'Grau I',
    GRAU_II: 'Grau II',
    GRAU_III: 'Grau III',
    SEM_AVALIACAO: 'Sem avaliação',
  };
  return labels[value] || value;
}

function parsePopulationProfile(indicators: IndicatorsByMonth): PopulationProfileSnapshot | null {
  const firstIndicator = Object.values(indicators)[0];
  const metadata = firstIndicator?.metadata;
  if (!metadata || typeof metadata !== 'object') return null;

  const candidate = (metadata as Record<string, unknown>).populationProfile;
  if (!candidate || typeof candidate !== 'object') return null;

  const profile = candidate as {
    referenceDate?: unknown;
    totalResidents?: unknown;
    byDependency?: unknown;
  };

  if (!Array.isArray(profile.byDependency)) return null;

  const parsedRows = profile.byDependency
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
    .map((row) => ({
      dependencyLevel: (row.dependencyLevel as PopulationProfileByDependency['dependencyLevel']) || 'SEM_AVALIACAO',
      total: Number(row.total ?? 0),
      female: Number(row.female ?? 0),
      male: Number(row.male ?? 0),
      other: Number(row.other ?? 0),
      percentage: Number(row.percentage ?? 0),
    }));

  return {
    referenceDate:
      typeof profile.referenceDate === 'string' ? profile.referenceDate : '',
    totalResidents: Number(profile.totalResidents ?? 0),
    byDependency: parsedRows,
  };
}

export async function generateMonthlyIndicatorsPdfReport(options: ExportOptions): Promise<void> {
  const {
    year,
    month,
    indicators,
    history,
    ilpiName,
    cnpj,
    cnes,
    tenantName,
    generatedBy,
    printDateTime,
  } = options;

  const PAGE_MARGIN = 15;
  const HEADER_HEIGHT = 30;
  const FOOTER_HEIGHT = 20;
  const FONTS = {
    title: 11,
    subtitle: 9.5,
    body: 8.5,
    bodyLarge: 9,
    footer: 7,
  };
  const BORDER_COLOR: [number, number, number] = [220, 220, 225];
  const TEXT_SECONDARY: [number, number, number] = [100, 100, 110];

  const reportIlpiName = ilpiName || tenantName || 'ILPI';
  const reportCnpj = cnpj || 'CNPJ não cadastrado';
  const generatedByName = generatedBy || 'Usuário';
  const generatedAt =
    printDateTime ||
    format(new Date(), "dd/MM/yyyy, HH:mm", { locale: ptBR });

  // Criar documento PDF
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let currentY = HEADER_HEIGHT + 8;

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  const reportTitle = 'Indicadores Mensais Obrigatórios';
  const periodText = `Período: ${monthName}`;

  const drawHeader = () => {
    doc.setFontSize(FONTS.title);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(reportIlpiName, PAGE_MARGIN, PAGE_MARGIN);

    doc.setFontSize(FONTS.body);
    doc.setFont('helvetica', 'normal');
    const institutionIds = cnes
      ? `CNPJ: ${reportCnpj} • CNES: ${cnes}`
      : `CNPJ: ${reportCnpj}`;
    doc.text(institutionIds, PAGE_MARGIN, PAGE_MARGIN + 5);

    doc.setFontSize(FONTS.title);
    doc.setFont('helvetica', 'bold');
    const titleWidth = doc.getTextWidth(reportTitle);
    doc.text(reportTitle, (pageWidth - titleWidth) / 2, PAGE_MARGIN + 10);

    doc.setFontSize(FONTS.subtitle);
    doc.setFont('helvetica', 'normal');
    const periodWidth = doc.getTextWidth(periodText);
    doc.text(periodText, (pageWidth - periodWidth) / 2, PAGE_MARGIN + 15);

    doc.setLineWidth(0.5);
    doc.setDrawColor(...BORDER_COLOR);
    doc.line(PAGE_MARGIN, HEADER_HEIGHT + 2, pageWidth - PAGE_MARGIN, HEADER_HEIGHT + 2);
  };

  const drawFooter = (pageNumber: number, totalPages: number) => {
    const footerY = pageHeight - FOOTER_HEIGHT;

    doc.setLineWidth(0.5);
    doc.setDrawColor(...BORDER_COLOR);
    doc.line(PAGE_MARGIN, footerY, pageWidth - PAGE_MARGIN, footerY);

    doc.setFontSize(FONTS.footer);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_SECONDARY);

    const legalText =
      'Artigos 58, 59 e Anexo da Resolução da Diretoria Colegiada (RDC) nº 502/2021 da ANVISA.';
    doc.setFont('helvetica', 'bolditalic');
    doc.text(legalText, PAGE_MARGIN, footerY + 5);

    doc.setFont('helvetica', 'normal');
    const footerText = `Impresso por ${generatedByName} em ${generatedAt}`;
    doc.text(footerText, PAGE_MARGIN, footerY + 9);

    const pageInfo = `Página ${pageNumber} de ${totalPages}`;
    const pageInfoWidth = doc.getTextWidth(pageInfo);
    doc.text(pageInfo, pageWidth - PAGE_MARGIN - pageInfoWidth, footerY + 9);

    const systemInfo = 'Documento gerado automaticamente pelo Rafa ILPI • Versão do relatório: 1.0';
    const systemInfoWidth = doc.getTextWidth(systemInfo);
    doc.text(systemInfo, (pageWidth - systemInfoWidth) / 2, footerY + 13);
  };

  const ensureSpace = (heightNeeded: number) => {
    const contentLimit = pageHeight - FOOTER_HEIGHT - 5;
    if (currentY + heightNeeded <= contentLimit) return;
    doc.addPage();
    currentY = HEADER_HEIGHT + 8;
  };

  // Configurar fontes
  doc.setFont('helvetica', 'normal');
  // Ordem dos indicadores
  const indicatorOrder: RdcIndicatorType[] = [
    RdcIndicatorType.MORTALIDADE,
    RdcIndicatorType.DIARREIA_AGUDA,
    RdcIndicatorType.ESCABIOSE,
    RdcIndicatorType.DESIDRATACAO,
    RdcIndicatorType.ULCERA_DECUBITO,
    RdcIndicatorType.DESNUTRICAO,
  ];

  // Preparar dados para tabela
  const tableData = indicatorOrder.map((indicatorType) => {
    const data = indicators[indicatorType];
    if (!data) {
      return [
        RDC_INDICATOR_LABELS[indicatorType],
        '0',
        '0',
        formatPercentage(0, 2),
        'Sem dados',
      ];
    }

    const status = getMonthlyIndicatorStatus({
      numerator: data.numerator,
      denominator: data.denominator,
      rate: data.rate,
    });

    return [
      RDC_INDICATOR_LABELS[indicatorType],
      data.numerator.toString(),
      data.denominator.toString(),
      formatPercentage(data.rate, 2),
      status.label,
    ];
  });

  // ====================
  // PERFIL DEMOGRÁFICO E ASSISTENCIAL
  // ====================
  const populationProfile = parsePopulationProfile(indicators);
  const firstIndicator = Object.values(indicators)[0];
  const fallbackPopulation = firstIndicator?.denominator || 0;
  const referenceDate =
    populationProfile?.referenceDate ||
    firstIndicator?.populationReferenceDate ||
    `${year}-${String(month).padStart(2, '0')}-15`;
  const totalPopulation =
    typeof populationProfile?.totalResidents === 'number' && populationProfile.totalResidents > 0
      ? populationProfile.totalResidents
      : fallbackPopulation;

  ensureSpace(20);
  doc.setFontSize(FONTS.bodyLarge);
  doc.setFont('helvetica', 'bold');
  doc.text('1. PERFIL DEMOGRÁFICO E ASSISTENCIAL', PAGE_MARGIN, currentY);
  currentY += 6;

  doc.setFontSize(FONTS.body);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `População exposta: ${totalPopulation} • Data de referência: ${formatDateOnlyBr(referenceDate)}`,
    PAGE_MARGIN,
    currentY,
  );
  currentY += 5;

  const filteredDependencyRows = populationProfile?.byDependency?.filter((row) => {
    // Mantém o perfil mais limpo: oculta "Sem avaliação" quando não há residentes nesse grupo.
    if (row.dependencyLevel === 'SEM_AVALIACAO' && row.total === 0) return false;
    return true;
  });

  const profileRows = filteredDependencyRows && filteredDependencyRows.length > 0
    ? filteredDependencyRows.map((row) => [
        getDependencyLevelLabel(row.dependencyLevel),
        String(row.total),
        formatPercentage(row.percentage, 1),
        `${row.female}/${row.male}/${row.other}`,
      ])
    : [['Sem detalhamento disponível', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY,
    head: [['Grau de Dependência', 'Total', '%', 'Gênero (F/M/O)']],
    body: profileRows,
    theme: 'grid',
    headStyles: {
      fillColor: [52, 152, 219],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: FONTS.body,
    },
    bodyStyles: {
      fontSize: FONTS.body,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 82 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 53, halign: 'center' },
    },
    margin: {
      left: PAGE_MARGIN,
      right: PAGE_MARGIN,
      top: HEADER_HEIGHT + 5,
      bottom: FOOTER_HEIGHT + 5,
    },
  });

  currentY = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
  doc.setFontSize(FONTS.footer);
  doc.setFont('helvetica', 'italic');
  const profileLegend = 'F = Feminino • M = Masculino • O = Outro';
  const profileLegendWidth = doc.getTextWidth(profileLegend);
  doc.text(profileLegend, (pageWidth - profileLegendWidth) / 2, currentY);
  currentY += 7;

  // ====================
  // INDICADORES MENSAIS
  // ====================
  ensureSpace(12);
  doc.setFontSize(FONTS.bodyLarge);
  doc.setFont('helvetica', 'bold');
  doc.text('2. INDICADORES MENSAIS', PAGE_MARGIN, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    head: [['Indicador', 'Casos', 'Residentes', 'Taxa', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: FONTS.body,
    },
    bodyStyles: {
      fontSize: FONTS.body,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 30, halign: 'center' },
    },
    margin: {
      left: PAGE_MARGIN,
      right: PAGE_MARGIN,
      top: HEADER_HEIGHT + 5,
      bottom: FOOTER_HEIGHT + 5,
    },
  });

  currentY = (doc.lastAutoTable?.finalY ?? currentY) + 10;
  const hasTrendHistory = Boolean(history && history.length > 0);

  // ====================
  // ANÁLISE DE TENDÊNCIA
  // ====================
  if (hasTrendHistory) {
    ensureSpace(16);
    doc.setFontSize(FONTS.bodyLarge);
    doc.setFont('helvetica', 'bold');
    doc.text('3. ANÁLISE DE TENDÊNCIA (ÚLTIMOS 12 MESES)', PAGE_MARGIN, currentY);
    currentY += 6;

    // Preparar dados históricos para tabela
    const sortedHistory = [...(history ?? [])]
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      })
      .slice(0, 6); // Últimos 6 meses

    const historyTableData = sortedHistory.map((item) => {
      const monthLabel = new Date(item.year, item.month - 1, 1).toLocaleDateString('pt-BR', {
        month: 'short',
        year: '2-digit',
      });

      const row = [monthLabel];

      indicatorOrder.forEach((indicatorType) => {
        const data = item.indicators[indicatorType];
        row.push(data ? formatPercentage(data.rate, 1) : '-');
      });

      return row;
    });

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          'Mês',
          'Mort.',
          'Diarr.',
          'Escab.',
          'Desidr.',
          'Úlcera',
          'Desnut.',
        ],
      ],
      body: historyTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: FONTS.body,
      },
      bodyStyles: {
        fontSize: FONTS.body,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'left' },
      },
      margin: {
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
        top: HEADER_HEIGHT + 5,
        bottom: FOOTER_HEIGHT + 5,
      },
    });

    currentY = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
    doc.setFontSize(FONTS.footer + 0.8);
    doc.setFont('helvetica', 'italic');
    const trendLegend = 'Valores representam a taxa percentual (%) de cada indicador no período.';
    const trendLegendWidth = doc.getTextWidth(trendLegend);
    doc.text(
      trendLegend,
      (pageWidth - trendLegendWidth) / 2,
      currentY,
    );
    currentY += 7;
  }

  // ====================
  // BASE LEGAL
  // ====================
  const legalText = [
    'Fórmulas de Cálculo:',
    '• Taxa de incidência = (casos novos / residentes no mês) × 100',
    '• Taxa de prevalência = (casos existentes / residentes no mês) × 100',
    '• Taxa de mortalidade = (óbitos / residentes no mês) × 100',
    '',
    'Metas de Qualidade (Recomendações):',
    '• Ótimo: 0% (ausência de casos)',
    '• Bom: < 5% (baixa incidência/prevalência)',
    '• Atenção: 5-10% (requer monitoramento)',
    '• Crítico: > 10% (requer intervenção imediata)',
    '• Atenção (base populacional pequena): população exposta < 20 e 1 caso confirmado no mês.',
  ];

  const legalLines = legalText.flatMap((line) => {
    if (!line) return [''];
    return doc.splitTextToSize(line, pageWidth - PAGE_MARGIN * 2) as string[];
  });
  const legalLineHeight = 4.2;
  const legalSectionHeight = 6 + 5 + legalLines.length * legalLineHeight;
  ensureSpace(legalSectionHeight);

  doc.setFontSize(FONTS.bodyLarge);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `${hasTrendHistory ? '4' : '3'}. FÓRMULA DE CÁLCULO E METAS DE QUALIDADE`,
    PAGE_MARGIN,
    currentY,
  );
  currentY += 5;

  doc.setFontSize(FONTS.body);
  doc.setFont('helvetica', 'normal');
  legalLines.forEach((line) => {
    doc.text(line, PAGE_MARGIN, currentY);
    currentY += legalLineHeight;
  });

  // ====================
  // RODAPÉ
  // ====================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawHeader();
    drawFooter(i, totalPages);
  }

  // Salvar PDF
  const fileName = `Indicadores_Mensais_${monthName.replace(/\s/g, '_')}.pdf`;
  doc.save(fileName);
}
