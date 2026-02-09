// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - MedicalRecordSidebar (Prontuário do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  User,
  HeartPulse,
  Syringe,
  FileText,
  NotebookPen,
  Pill,
  PillBottle,
  ClipboardList,
  Calendar,
} from 'lucide-react'
import type { MedicalSection } from './types'

// ========== TYPES ==========

interface MedicalRecordSidebarProps {
  activeSection: MedicalSection
  onSectionChange: (section: MedicalSection) => void
}

// ========== CONSTANTS ==========

const SECTIONS: Array<{
  id: MedicalSection
  label: string
  description: string
  icon: React.ElementType
}> = [
  {
    id: 'personal',
    label: 'Sumário do Residente',
    description: 'Resumo de saúde e informações essenciais',
    icon: User,
  },
  {
    id: 'clinical-profile',
    label: 'Perfil Clínico',
    description: 'Condições, alergias e avaliação funcional',
    icon: HeartPulse,
  },
  {
    id: 'vaccinations',
    label: 'Vacinação',
    description: 'Histórico de vacinas',
    icon: Syringe,
  },
  {
    id: 'health-documents',
    label: 'Documentos de Saúde',
    description: 'Exames, laudos e receitas',
    icon: FileText,
  },
  {
    id: 'clinical-notes',
    label: 'Evoluções Clínicas',
    description: 'Notas SOAP multiprofissionais',
    icon: NotebookPen,
  },
  {
    id: 'prescriptions',
    label: 'Prescrições',
    description: 'Medicamentos e tratamentos',
    icon: Pill,
  },
  {
    id: 'medications',
    label: 'Medicações',
    description: 'Administrações diárias',
    icon: PillBottle,
  },
  {
    id: 'daily-records',
    label: 'Registros Diários',
    description: 'Acompanhamento diário',
    icon: ClipboardList,
  },
  {
    id: 'schedule',
    label: 'Agenda do Residente',
    description: 'Rotinas e agendamentos',
    icon: Calendar,
  },
]

// ========== COMPONENT ==========

export function MedicalRecordSidebar({
  activeSection,
  onSectionChange,
}: MedicalRecordSidebarProps) {
  return (
    <Card className="h-fit sticky top-4">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Navegação do prontuário</h3>
          <p className="text-xs text-muted-foreground">Acesse as seções abaixo</p>
        </div>

        <ScrollArea className="h-[calc(100vh-280px)] max-h-[500px]">
          <nav className="p-2 space-y-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block">{section.label}</span>
                    <span
                      className={cn(
                        'text-xs block truncate',
                        isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      )}
                    >
                      {section.description}
                    </span>
                  </div>
                </button>
              )
            })}
          </nav>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
