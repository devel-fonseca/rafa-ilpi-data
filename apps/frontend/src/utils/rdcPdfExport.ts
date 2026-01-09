import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RdcIndicatorType, RDC_INDICATOR_LABELS } from '@/types/incidents';

interface IndicatorData {
  numerator: number;
  denominator: number;
  rate: number;
  incidentIds: string[];
  calculatedAt: string;
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
  tenantName?: string;
  generatedBy?: string;
}

export async function generateRdcPdfReport(options: ExportOptions): Promise<void> {
  const { year, month, indicators, history, tenantName, generatedBy } = options;

  // Criar documento PDF
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let currentY = 20;

  // Configurar fontes
  doc.setFont('helvetica', 'normal');

  // ====================
  // CABEÇALHO
  // ====================
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE CONFORMIDADE', pageWidth / 2, currentY, {
    align: 'center',
  });
  currentY += 8;

  doc.setFontSize(14);
  doc.text('RDC 502/2021 - ANVISA', pageWidth / 2, currentY, {
    align: 'center',
  });
  currentY += 10;

  // Linha separadora
  doc.setLineWidth(0.5);
  doc.line(20, currentY, pageWidth - 20, currentY);
  currentY += 8;

  // Informações do relatório
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  if (tenantName) {
    doc.text(`Instituição: ${tenantName}`, 20, currentY);
    currentY += 6;
  }

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Período de Referência: ${monthName}`, 20, currentY);
  currentY += 6;

  doc.text(
    `Data de Geração: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
    20,
    currentY,
  );
  currentY += 6;

  if (generatedBy) {
    doc.text(`Gerado por: ${generatedBy}`, 20, currentY);
    currentY += 6;
  }

  currentY += 5;

  // ====================
  // RESUMO EXECUTIVO
  // ====================
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. RESUMO EXECUTIVO DOS INDICADORES', 20, currentY);
  currentY += 8;

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
        '0.00%',
        'Sem dados',
      ];
    }

    const statusColor = data.rate === 0 ? '✓ Ótimo' : data.rate < 5 ? '⚠ Bom' : data.rate < 10 ? '⚠ Atenção' : '✗ Crítico';

    return [
      RDC_INDICATOR_LABELS[indicatorType],
      data.numerator.toString(),
      data.denominator.toString(),
      `${data.rate.toFixed(2)}%`,
      statusColor,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Indicador', 'Casos', 'Residentes', 'Taxa', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
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
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ====================
  // ANÁLISE DE TENDÊNCIA
  // ====================
  if (history && history.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. ANÁLISE DE TENDÊNCIA (ÚLTIMOS 12 MESES)', 20, currentY);
    currentY += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Nota: Valores representam a taxa percentual (%) de cada indicador no período.',
      20,
      currentY,
    );
    currentY += 6;

    // Preparar dados históricos para tabela
    const sortedHistory = [...history]
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
        row.push(data ? `${data.rate.toFixed(1)}%` : '-');
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
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'left' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Verificar se precisa adicionar nova página
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 20;
  }

  // ====================
  // BASE LEGAL
  // ====================
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. BASE LEGAL E OBRIGATORIEDADE', 20, currentY);
  currentY += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const legalText = [
    'Base Legal: Resolução da Diretoria Colegiada (RDC) nº 502/2021 da ANVISA,',
    'Artigos 58-59 e Anexo.',
    '',
    'Obrigatoriedade: Todos os 6 indicadores devem ser calculados e registrados',
    'mensalmente pelas Instituições de Longa Permanência para Idosos (ILPIs).',
    '',
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
  ];

  legalText.forEach((line) => {
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
    }
    doc.text(line, 20, currentY);
    currentY += 5;
  });

  currentY += 5;

  // ====================
  // RODAPÉ
  // ====================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' },
    );
    doc.text(
      'Documento gerado automaticamente pelo Sistema Rafa ILPI',
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' },
    );
  }

  // Salvar PDF
  const fileName = `RDC_502_2021_${monthName.replace(/\s/g, '_')}.pdf`;
  doc.save(fileName);
}
