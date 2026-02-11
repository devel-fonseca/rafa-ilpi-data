// ──────────────────────────────────────────────────────────────────────────────
//  PAGE - CareShiftsPage (Página Principal do Módulo de Escalas)
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Calendar, Settings, ClipboardCheck, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Page, PageHeader } from '@/design-system/components';
import { TeamsViewTab } from './TeamsViewTab';
import { ShiftsViewTab } from './ShiftsViewTab';
import { ShiftsCalendarTab } from './ShiftsCalendarTab';
import { TurnsConfigTab } from './TurnsConfigTab';
import { CoverageReportTab } from './CoverageReportTab';
import { ShiftsHistoryTab } from './ShiftsHistoryTab';

const VALID_TABS = ['calendar', 'shifts', 'teams', 'turns-config', 'coverage', 'history'];

export default function CareShiftsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'calendar';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sincronizar URL quando tab muda
  useEffect(() => {
    if (activeTab !== 'calendar') {
      setSearchParams({ tab: activeTab }, { replace: true });
    } else {
      // Remover param se for a tab default
      setSearchParams({}, { replace: true });
    }
  }, [activeTab, setSearchParams]);

  return (
    <Page>
      <PageHeader
        title="Escalas e Plantões"
        subtitle="Gestão de turnos, equipes e plantões de cuidadores em conformidade com RDC 502/2021"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendário</span>
          </TabsTrigger>
          <TabsTrigger value="shifts" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Plantões</span>
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Equipes</span>
          </TabsTrigger>
          <TabsTrigger value="turns-config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurar Turnos</span>
          </TabsTrigger>
          <TabsTrigger value="coverage" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Cobertura</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba de Calendário (NOVA - Principal) */}
        <TabsContent value="calendar">
          <ShiftsCalendarTab />
        </TabsContent>

        {/* Aba de Plantões */}
        <TabsContent value="shifts">
          <ShiftsViewTab />
        </TabsContent>

        {/* Aba de Equipes */}
        <TabsContent value="teams">
          <TeamsViewTab />
        </TabsContent>

        {/* Aba de Configurar Turnos */}
        <TabsContent value="turns-config">
          <TurnsConfigTab />
        </TabsContent>

        {/* Aba de Cobertura */}
        <TabsContent value="coverage">
          <CoverageReportTab />
        </TabsContent>

        {/* Aba de Histórico */}
        <TabsContent value="history">
          <ShiftsHistoryTab />
        </TabsContent>
      </Tabs>
    </Page>
  );
}
