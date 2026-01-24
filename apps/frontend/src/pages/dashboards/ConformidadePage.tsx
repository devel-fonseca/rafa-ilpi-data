import { Page, PageHeader } from '@/design-system/components';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, BarChart3, Shield, AlertTriangle, Lock, Zap, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSentinelEvents } from '@/hooks/useSentinelEvents';
import { useAssessments } from '@/hooks/useComplianceAssessments';
import { useFeatures } from '@/hooks/useFeatures';
import { differenceInHours } from 'date-fns';
import { useState } from 'react';

export function ConformidadePage() {
  const navigate = useNavigate();
  const { hasFeature } = useFeatures();
  const [blockedFeature, setBlockedFeature] = useState<{
    name: string;
    description: string;
  } | null>(null);

  // Buscar eventos sentinela para mostrar badge de alerta
  const { data: sentinelEvents } = useSentinelEvents();
  const pendingEvents = sentinelEvents?.filter((e) => e.status === 'PENDENTE') || [];
  const overdueEvents =
    pendingEvents.filter((e) => {
      const hoursElapsed = differenceInHours(new Date(), new Date(e.createdAt));
      return hoursElapsed > 24;
    }) || [];

  // Buscar último autodiagnóstico para mostrar status
  const { data: assessmentsData } = useAssessments({ page: 1, limit: 1 });
  const lastAssessment = assessmentsData?.data?.[0];

  /**
   * Manipula clique em card - verifica feature antes de navegar
   */
  const handleCardClick = (featureKey: string, route: string, featureName: string, description: string) => {
    if (hasFeature(featureKey)) {
      navigate(route);
    } else {
      setBlockedFeature({ name: featureName, description });
    }
  };

  return (
    <Page>
      <PageHeader
        title="Hub de Conformidade"
        subtitle="Central de conformidade regulatória e documental"
      />

      {/* Grid de Cards de Navegação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Documentos Institucionais */}
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() =>
            handleCardClick(
              'documentos_institucionais',
              '/dashboard/conformidade/documentos',
              'Documentos Institucionais',
              'Gestão de documentos obrigatórios: estatuto, alvarás, licenças sanitárias, AVCB e outros.'
            )
          }
        >
          <CardContent className="p-6">
            <FileText className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Documentos da Instituição
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Gestão de documentos obrigatórios: estatuto, alvarás, licenças
              sanitárias, AVCB e outros.
            </p>
            <Button variant="outline" className="w-full">
              Ver Documentos →
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Indicadores Mensais RDC */}
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() =>
            handleCardClick(
              'indicadores_mensais',
              '/dashboard/conformidade/indicadores-mensais',
              'Indicadores Mensais Obrigatórios',
              'Indicadores RDC 502/2021 (ANVISA): mortalidade, doenças, úlceras e desnutrição.'
            )
          }
        >
          <CardContent className="p-6">
            <BarChart3 className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Indicadores Mensais Obrigatórios
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Indicadores RDC 502/2021 (ANVISA): mortalidade, doenças, úlceras e
              desnutrição.
            </p>
            <Button variant="outline" className="w-full">
              Ver Indicadores →
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Eventos Sentinela */}
        <Card
          className={`hover:shadow-lg transition-shadow cursor-pointer ${
            overdueEvents.length > 0 ? 'border-danger' : ''
          }`}
          onClick={() =>
            handleCardClick(
              'eventos_sentinela',
              '/dashboard/conformidade/eventos-sentinela',
              'Eventos Sentinela',
              'Rastreamento de notificações obrigatórias: quedas com lesão e tentativas de suicídio.'
            )
          }
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <AlertTriangle
                className={`h-12 w-12 ${
                  overdueEvents.length > 0
                    ? 'text-danger/600'
                    : pendingEvents.length > 0
                      ? 'text-amber-600'
                      : 'text-primary'
                }`}
              />
              {pendingEvents.length > 0 && (
                <Badge
                  variant={overdueEvents.length > 0 ? 'destructive' : 'default'}
                >
                  {pendingEvents.length} pendente(s)
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-semibold mb-2">Eventos Sentinela</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Rastreamento de notificações obrigatórias: quedas com lesão e
              tentativas de suicídio.
            </p>
            {overdueEvents.length > 0 && (
              <p className="text-xs text-danger/600 font-medium mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {overdueEvents.length} evento(s) atrasado(s) &gt;24h
              </p>
            )}
            <Button
              variant={overdueEvents.length > 0 ? 'destructive' : 'outline'}
              className="w-full"
            >
              {overdueEvents.length > 0 ? 'Regularizar Urgente →' : 'Ver Eventos →'}
            </Button>
          </CardContent>
        </Card>

        {/* Card 4: Autodiagnóstico RDC 502/2021 */}
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() =>
            handleCardClick(
              'autodiagnostico_rdc',
              '/dashboard/conformidade/autodiagnostico',
              'Autodiagnóstico RDC 502/2021',
              'Avaliação de conformidade com o Roteiro Objetivo de Inspeção ILPI da ANVISA.'
            )
          }
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <ClipboardCheck className="h-12 w-12 text-primary" />
              {lastAssessment && lastAssessment.status === 'COMPLETED' && (
                <Badge
                  variant={
                    lastAssessment.complianceLevel === 'REGULAR'
                      ? 'default'
                      : lastAssessment.complianceLevel === 'PARCIAL'
                        ? 'secondary'
                        : 'destructive'
                  }
                  className={
                    lastAssessment.complianceLevel === 'REGULAR'
                      ? 'bg-success'
                      : lastAssessment.complianceLevel === 'PARCIAL'
                        ? 'bg-warning'
                        : ''
                  }
                >
                  {lastAssessment.compliancePercentage.toFixed(1)}%
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Autodiagnóstico RDC 502/2021
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Avaliação de conformidade com indicadores regulatórios da ANVISA.
            </p>
            {lastAssessment && lastAssessment.status === 'COMPLETED' && (
              <p className="text-xs text-muted-foreground mb-2">
                Último resultado: <strong>{lastAssessment.complianceLevel}</strong>
              </p>
            )}
            <Button variant="outline" className="w-full">
              {lastAssessment && lastAssessment.status === 'DRAFT'
                ? 'Continuar Rascunho →'
                : lastAssessment && lastAssessment.status === 'COMPLETED'
                  ? 'Ver Resultados →'
                  : 'Iniciar Autodiagnóstico →'}
            </Button>
          </CardContent>
        </Card>

        {/* Card 5: Placeholder Futuro */}
        <Card className="opacity-60">
          <CardContent className="p-6">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-muted-foreground">
              Outras Conformidades
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Em breve: outras áreas de conformidade regulatória.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Em desenvolvimento
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Card Informativo */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h4 className="text-sm font-semibold mb-2">
            📋 Sobre a Conformidade Regulatória
          </h4>
          <p className="text-sm text-muted-foreground">
            Esta central reúne todas as áreas de conformidade exigidas pela
            legislação brasileira para Instituições de Longa Permanência para
            Idosos (ILPIs). Mantenha sua documentação e indicadores sempre
            atualizados para garantir conformidade com ANVISA, Vigilância
            Sanitária e demais órgãos reguladores.
          </p>
        </CardContent>
      </Card>

      {/* Modal de Feature Bloqueada */}
      <Dialog open={!!blockedFeature} onOpenChange={() => setBlockedFeature(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Lock className="h-6 w-6 text-amber-600 dark:text-amber-500" />
            </div>
            <DialogTitle className="text-center">Recurso Bloqueado</DialogTitle>
            <DialogDescription className="text-center">
              <strong className="text-foreground">{blockedFeature?.name}</strong> não está
              disponível no seu plano atual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {blockedFeature?.description}
            </p>

            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground text-center">
                💡 Faça upgrade do seu plano para desbloquear este e outros recursos
                avançados
              </p>
            </div>
          </div>

          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setBlockedFeature(null)}>
              Voltar
            </Button>
            <Button
              onClick={() => {
                setBlockedFeature(null);
                navigate('/settings/billing');
              }}
            >
              <Zap className="mr-2 h-4 w-4" />
              Fazer Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
