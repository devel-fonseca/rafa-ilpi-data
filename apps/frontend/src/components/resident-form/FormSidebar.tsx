// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - FormSidebar (Formulário de Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  User,
  Phone,
  MapPin,
  UserCheck,
  HeartPulse,
  CreditCard,
  ClipboardCheck,
  FileText,
  Lock,
} from 'lucide-react'

// ========== TYPES ==========

export type FormSection =
  | 'identificacao'
  | 'contatos'
  | 'endereco'
  | 'responsavel'
  | 'saude'
  | 'convenios'
  | 'admissao'
  | 'documentos'

interface FormSidebarProps {
  activeSection: FormSection
  onSectionChange: (section: FormSection) => void
  isNewResident?: boolean
  hasErrors?: Partial<Record<FormSection, boolean>>
}

// ========== CONSTANTS ==========

const SECTIONS: Array<{
  id: FormSection
  label: string
  description: string
  icon: React.ElementType
  requiresId?: boolean
}> = [
  { id: 'identificacao', label: 'Identificação', description: 'Dados pessoais e foto do residente', icon: User },
  { id: 'contatos', label: 'Contatos de Emergência', description: 'Pessoas para contato em emergências', icon: Phone },
  { id: 'endereco', label: 'Endereço', description: 'Endereço atual e procedência', icon: MapPin },
  { id: 'responsavel', label: 'Responsável', description: 'Dados do responsável legal', icon: UserCheck },
  { id: 'saude', label: 'Saúde', description: 'Dados antropométricos e mobilidade', icon: HeartPulse },
  { id: 'convenios', label: 'Convênios', description: 'Planos de saúde vinculados', icon: CreditCard },
  { id: 'admissao', label: 'Admissão', description: 'Admissão, desligamento e acomodação', icon: ClipboardCheck },
  { id: 'documentos', label: 'Documentos', description: 'Documentos anexados', icon: FileText, requiresId: true },
]

// ========== COMPONENT ==========

export function FormSidebar({
  activeSection,
  onSectionChange,
  isNewResident = false,
  hasErrors = {},
}: FormSidebarProps) {
  return (
    <Card className="h-fit sticky top-4">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Navegação do cadastro</h3>
          <p className="text-xs text-muted-foreground">Preenchimento por seções</p>
        </div>

        <ScrollArea className="h-[calc(100vh-280px)] max-h-[450px]">
          <nav className="p-2 space-y-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              const isDisabled = section.requiresId && isNewResident
              const hasError = hasErrors[section.id]

              return (
                <button
                  key={section.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && onSectionChange(section.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isDisabled
                      ? 'opacity-50 cursor-not-allowed text-muted-foreground'
                      : 'hover:bg-muted/50',
                    hasError && !isActive && 'border-l-2 border-destructive'
                  )}
                >
                  {isDisabled ? (
                    <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block">{section.label}</span>
                    <span className={cn(
                      'text-xs block truncate',
                      isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    )}>
                      {section.description}
                    </span>
                  </div>
                  {hasError && !isActive && (
                    <span className="h-2 w-2 rounded-full bg-destructive flex-shrink-0 mt-1.5" />
                  )}
                </button>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Legenda para documentos */}
        {isNewResident && (
          <div className="border-t p-3">
            <p className="text-xs text-muted-foreground text-center">
              <Lock className="h-3 w-3 inline mr-1" />
              Documentos disponíveis após salvar
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
