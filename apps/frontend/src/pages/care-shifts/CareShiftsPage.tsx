// ──────────────────────────────────────────────────────────────────────────────
//  PAGE - CareShiftsPage (Página Principal do Módulo de Escalas)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Users, Calendar, Settings, ClipboardCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Page, PageHeader } from '@/design-system/components';
import { TeamsViewTab } from './TeamsViewTab';
import { ShiftsViewTab } from './ShiftsViewTab';
import { WeeklyScheduleTab } from './WeeklyScheduleTab';
import { TurnsConfigTab } from './TurnsConfigTab';

export default function CareShiftsPage() {
  const [activeTab, setActiveTab] = useState('teams');

  return (
    <Page>
      <PageHeader
        title="Escala de Cuidados"
        subtitle="Gestão de turnos, equipes e plantões de cuidadores em conformidade com RDC 502/2021"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Equipes</span>
          </TabsTrigger>
          <TabsTrigger value="shifts" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Plantões</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Padrão Semanal</span>
          </TabsTrigger>
          <TabsTrigger value="turns-config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurar Turnos</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2" disabled>
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Conformidade RDC</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba de Equipes */}
        <TabsContent value="teams">
          <TeamsViewTab />
        </TabsContent>

        {/* Aba de Plantões */}
        <TabsContent value="shifts">
          <ShiftsViewTab />
        </TabsContent>

        {/* Aba de Padrão Semanal */}
        <TabsContent value="schedule">
          <WeeklyScheduleTab />
        </TabsContent>

        {/* Aba de Configurar Turnos */}
        <TabsContent value="turns-config">
          <TurnsConfigTab />
        </TabsContent>

        {/* Aba de Conformidade RDC (Futuro) */}
        <TabsContent value="compliance">
          <div className="text-center py-12 text-muted-foreground">
            Aba de Conformidade RDC - A implementar futuramente
          </div>
        </TabsContent>
      </Tabs>
    </Page>
  );
}
