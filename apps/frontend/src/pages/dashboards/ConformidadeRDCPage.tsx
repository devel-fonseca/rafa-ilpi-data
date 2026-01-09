import React, { useState } from 'react';
import { Page, PageHeader } from '@/design-system/components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { RdcIndicatorCard } from '@/components/rdc/RdcIndicatorCard';
import { RdcTrendChart } from '@/components/rdc/RdcTrendChart';
import { IndicatorDetailsModal } from '@/components/rdc/IndicatorDetailsModal';
import {
  useRdcIndicators,
  useRdcIndicatorsHistory,
  useRecalculateIndicators,
} from '@/hooks/useRdcIndicators';
import { RdcIndicatorType } from '@/types/incidents';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateRdcPdfReport } from '@/utils/rdcPdfExport';
import { useAuthStore } from '@/stores/auth.store';

export function ConformidadeRDCPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { recalculate } = useRecalculateIndicators();

  // Estado para controle de mês/ano
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  // Estado para modal de detalhes
  const [detailsModal, setDetailsModal] = useState<{
    open: boolean;
    indicatorType: RdcIndicatorType | null;
    incidentIds: string[];
  }>({
    open: false,
    indicatorType: null,
    incidentIds: [],
  });

  // Buscar dados
  const { data: indicators, isLoading } = useRdcIndicators(
    selectedYear,
    selectedMonth,
  );
  const { data: history } = useRdcIndicatorsHistory(12);

  // Dados do mês anterior para comparação
  const previousMonthData = React.useMemo(() => {
    if (!history || history.length < 2) return null;

    // Encontrar mês anterior
    const currentPeriod = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const sortedHistory = [...history].sort((a, b) => {
      const keyA = `${a.year}-${String(a.month).padStart(2, '0')}`;
      const keyB = `${b.year}-${String(b.month).padStart(2, '0')}`;
      return keyB.localeCompare(keyA);
    });

    const currentIndex = sortedHistory.findIndex(
      (item) =>
        `${item.year}-${String(item.month).padStart(2, '0')}` === currentPeriod,
    );

    if (currentIndex >= 0 && currentIndex < sortedHistory.length - 1) {
      return sortedHistory[currentIndex + 1];
    }
    return null;
  }, [history, selectedYear, selectedMonth]);

  // Handlers
  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    const isCurrentMonth =
      selectedYear === now.getFullYear() &&
      selectedMonth === now.getMonth() + 1;

    if (isCurrentMonth) return; // Não avançar além do mês atual

    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleRecalculate = async () => {
    try {
      await recalculate(selectedYear, selectedMonth);
      queryClient.invalidateQueries({ queryKey: ['rdc-indicators'] });
      toast.success('Indicadores recalculados com sucesso!');
    } catch (error) {
      toast.error('Erro ao recalcular indicadores');
    }
  };

  const handleOpenDetails = (
    indicatorType: RdcIndicatorType,
    incidentIds: string[],
  ) => {
    setDetailsModal({
      open: true,
      indicatorType,
      incidentIds,
    });
  };

  const handleCloseDetails = () => {
    setDetailsModal({
      open: false,
      indicatorType: null,
      incidentIds: [],
    });
  };

  const handleExportPdf = async () => {
    if (!indicators) {
      toast.error('Nenhum dado disponível para exportar');
      return;
    }

    try {
      toast.info('Gerando relatório PDF...');

      await generateRdcPdfReport({
        year: selectedYear,
        month: selectedMonth,
        indicators,
        history: history || [],
        tenantName: user?.tenant?.name,
        generatedBy: user?.fullName,
      });

      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar relatório PDF');
    }
  };

  const isCurrentMonth =
    selectedYear === currentDate.getFullYear() &&
    selectedMonth === currentDate.getMonth() + 1;

  // Formatação de data
  const monthLabel = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString(
    'pt-BR',
    {
      month: 'long',
      year: 'numeric',
    },
  );

  // Ordem dos indicadores
  const indicatorOrder: RdcIndicatorType[] = [
    RdcIndicatorType.MORTALIDADE,
    RdcIndicatorType.DIARREIA_AGUDA,
    RdcIndicatorType.ESCABIOSE,
    RdcIndicatorType.DESIDRATACAO,
    RdcIndicatorType.ULCERA_DECUBITO,
    RdcIndicatorType.DESNUTRICAO,
  ];

  return (
    <Page>
      <PageHeader
        title="Indicadores Mensais Obrigatórios"
        subtitle="RDC 502/2021 - ANVISA (Art. 58-59 + Anexo)"
        breadcrumbs={[
          { label: 'Conformidade', href: '/dashboard/conformidade' },
          { label: 'Indicadores Mensais' },
        ]}
      />

      {/* Controles */}
      <div className="flex justify-between items-center mb-6">
        {/* Navegação de mês */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-lg font-semibold capitalize min-w-[200px] text-center">
            {monthLabel}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recalcular
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={!indicators || isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Grid de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {indicatorOrder.map((indicatorType) => {
          const data = indicators?.[indicatorType];
          const previousData = previousMonthData?.indicators[indicatorType];

          return (
            <RdcIndicatorCard
              key={indicatorType}
              indicatorType={indicatorType}
              rate={data?.rate || 0}
              numerator={data?.numerator || 0}
              denominator={data?.denominator || 0}
              previousRate={previousData?.rate}
              incidentIds={data?.incidentIds || []}
              year={selectedYear}
              month={selectedMonth}
              onViewDetails={() =>
                handleOpenDetails(indicatorType, data?.incidentIds || [])
              }
              isLoading={isLoading}
            />
          );
        })}
      </div>

      {/* Gráfico de Tendência */}
      <div className="mb-8">
        <RdcTrendChart data={history || []} isLoading={!history} />
      </div>

      {/* Card de Informações Legais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            📋 Informações sobre os Indicadores RDC 502/2021
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Base Legal:</strong> Resolução da Diretoria Colegiada (RDC) nº
            502/2021 da ANVISA, Artigos 58-59 e Anexo.
          </p>
          <p>
            <strong>Obrigatoriedade:</strong> Todos os 6 indicadores devem ser
            calculados e registrados mensalmente.
          </p>
          <p>
            <strong>Fórmulas:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Taxa de incidência</strong> = (casos novos / residentes no
              mês) × 100
            </li>
            <li>
              <strong>Taxa de prevalência</strong> = (casos existentes / residentes
              no mês) × 100
            </li>
            <li>
              <strong>Taxa de mortalidade</strong> = (óbitos / residentes no mês) ×
              100
            </li>
          </ul>
          <p className="text-xs mt-4 pt-4 border-t">
            <strong>Cálculo Automático:</strong> Os indicadores são calculados
            automaticamente todos os dias às 02:00. Você pode forçar um recálculo
            usando o botão "Recalcular" acima.
          </p>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      {detailsModal.indicatorType && (
        <IndicatorDetailsModal
          open={detailsModal.open}
          onClose={handleCloseDetails}
          indicatorType={detailsModal.indicatorType}
          incidentIds={detailsModal.incidentIds}
          year={selectedYear}
          month={selectedMonth}
        />
      )}
    </Page>
  );
}
