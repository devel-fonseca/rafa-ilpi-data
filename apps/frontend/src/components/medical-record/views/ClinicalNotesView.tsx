// ──────────────────────────────────────────────────────────────────────────────
//  VIEW - ClinicalNotesView (Evoluções Clínicas SOAP)
// ──────────────────────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Zap } from 'lucide-react'
import { ClinicalNotesList } from '@/components/clinical-notes'
import { useFeatures } from '@/hooks/useFeatures'
import type { MedicalViewProps } from '../types'

export function ClinicalNotesView({ residentId, residentName }: MedicalViewProps) {
  const navigate = useNavigate()
  const { hasFeature } = useFeatures()

  if (!hasFeature('evolucoes_clinicas')) {
    return (
      <Card>
        <CardContent className="py-16 px-4">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Lock className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <h3 className="text-lg font-semibold">Recurso Bloqueado</h3>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Evoluções clínicas multiprofissionais</strong> não está disponível no seu plano atual.
              </p>
              <p className="text-sm text-muted-foreground">
                Registro SOAP de evoluções clínicas por médicos, enfermeiros, fisioterapeutas, nutricionistas e outros profissionais. Histórico completo e organizado por data.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border border-border max-w-md">
              <p className="text-xs text-muted-foreground text-center">
                Faça upgrade do seu plano para desbloquear este e outros recursos avançados
              </p>
            </div>
            <Button onClick={() => navigate('/settings/billing')}>
              <Zap className="mr-2 h-4 w-4" />
              Fazer Upgrade
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return <ClinicalNotesList residentId={residentId} residentName={residentName} />
}
