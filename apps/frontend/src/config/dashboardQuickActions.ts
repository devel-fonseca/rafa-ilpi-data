import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Calendar,
  FileText,
  LayoutGrid,
  Landmark,
  Pill,
  UserPlus,
  Users,
} from 'lucide-react';
import { PositionCode } from '@/types/permissions';

export type DashboardQuickActionContext =
  | 'admin'
  | 'technical_manager'
  | 'caregiver';

export interface DashboardQuickActionDefinition {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  disabled?: boolean;
  visibleFor?: PositionCode[];
}

const DASHBOARD_QUICK_ACTIONS: Record<
  DashboardQuickActionContext,
  DashboardQuickActionDefinition[]
> = {
  admin: [
    {
      id: 'residents_hub',
      title: 'Gestão de Residentes',
      description: 'Controle e monitoramento',
      icon: LayoutGrid,
      to: '/dashboard/residentes-hub',
      visibleFor: [PositionCode.ADMINISTRATOR],
    },
    {
      id: 'resident_panel',
      title: 'Painel do Residente',
      description: 'Visualização centralizada de informações',
      icon: Users,
      to: '/dashboard/painel-residente',
      visibleFor: [PositionCode.ADMINISTRATOR],
    },
    {
      id: 'reports',
      title: 'Relatórios',
      description: 'Central de relatórios e documentos',
      icon: FileText,
      to: '/dashboard/relatorios',
      visibleFor: [PositionCode.ADMINISTRATOR],
    },
    {
      id: 'financial_operations',
      title: 'Financeiro',
      description: 'Lançamentos e categorias financeiras',
      icon: Landmark,
      to: '/dashboard/financeiro',
      visibleFor: [PositionCode.ADMINISTRATOR],
    },
    {
      id: 'agenda',
      title: 'Agenda',
      description: 'Ver medicamentos e agendamentos',
      icon: Calendar,
      to: '/dashboard/agenda',
      visibleFor: [PositionCode.ADMINISTRATOR],
    },
  ],
  technical_manager: [
    {
      id: 'agenda_today',
      title: 'Agenda de Hoje',
      description: 'Ver medicamentos e agendamentos',
      icon: Calendar,
      to: '/dashboard/agenda',
      visibleFor: [PositionCode.TECHNICAL_MANAGER],
    },
    {
      id: 'daily_records',
      title: 'Registros Diários',
      description: 'Registrar atividades do dia',
      icon: Activity,
      to: '/dashboard/registros-diarios',
      visibleFor: [PositionCode.TECHNICAL_MANAGER],
    },
    {
      id: 'resident_panel',
      title: 'Painel do Residente',
      description: 'Informações clínicas centralizadas',
      icon: Users,
      to: '/dashboard/painel-residente',
      visibleFor: [PositionCode.TECHNICAL_MANAGER],
    },
    {
      id: 'residents_hub',
      title: 'Gestão de Residentes',
      description: 'Controle e monitoramento',
      icon: LayoutGrid,
      to: '/dashboard/residentes-hub',
      visibleFor: [PositionCode.TECHNICAL_MANAGER],
    },
    {
      id: 'prescriptions',
      title: 'Prescrições',
      description: 'Painel de Prescrições',
      icon: Pill,
      to: '/dashboard/prescricoes/painel',
      visibleFor: [PositionCode.TECHNICAL_MANAGER],
    },
    {
      id: 'reports',
      title: 'Relatórios',
      description: 'Central de relatórios e documentos',
      icon: FileText,
      to: '/dashboard/relatorios',
      visibleFor: [PositionCode.TECHNICAL_MANAGER],
    },
    {
      id: 'financial_operations',
      title: 'Financeiro',
      description: 'Lançamentos e categorias financeiras',
      icon: Landmark,
      to: '/dashboard/financeiro',
      visibleFor: [PositionCode.TECHNICAL_MANAGER],
    },
    {
      id: 'add_resident',
      title: 'Adicionar Residente',
      description: 'Cadastrar novo residente',
      icon: UserPlus,
      to: '/dashboard/residentes/new',
      visibleFor: [PositionCode.TECHNICAL_MANAGER],
    },
  ],
  caregiver: [
    {
      id: 'daily_records',
      title: 'Registros Diários',
      description: 'Registrar atividades do dia',
      icon: Activity,
      to: '/dashboard/registros-diarios',
      visibleFor: [PositionCode.CAREGIVER],
    },
    {
      id: 'prescriptions',
      title: 'Prescrições',
      description: 'Painel de prescrições',
      icon: Pill,
      to: '/dashboard/prescricoes/painel',
      visibleFor: [PositionCode.CAREGIVER],
    },
  ],
};

export function getDashboardQuickActions(
  context: DashboardQuickActionContext,
  positionCode?: string | null,
): DashboardQuickActionDefinition[] {
  const actions = DASHBOARD_QUICK_ACTIONS[context] || [];

  if (!positionCode) {
    return actions.filter((action) => !action.visibleFor);
  }

  return actions.filter(
    (action) =>
      !action.visibleFor ||
      action.visibleFor.includes(positionCode as PositionCode),
  );
}
