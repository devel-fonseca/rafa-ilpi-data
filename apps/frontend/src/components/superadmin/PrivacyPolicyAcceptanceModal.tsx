import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import type { PrivacyPolicyAcceptance } from '@/api/contracts.api'
import ReactMarkdown from 'react-markdown'
import { CheckCircle2, XCircle } from 'lucide-react'

interface PrivacyPolicyAcceptanceModalProps {
  acceptance: PrivacyPolicyAcceptance | null
  open: boolean
  onClose: () => void
}

export function PrivacyPolicyAcceptanceModal({
  acceptance,
  open,
  onClose,
}: PrivacyPolicyAcceptanceModalProps) {
  if (!acceptance) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Política de Privacidade Aceita</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Informações Principais */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 mb-1">Versão da Política</p>
              <p className="text-slate-900 font-medium">
                {acceptance.policyVersion}
              </p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Data de Vigência</p>
              <p className="text-slate-900 font-medium">
                {acceptance.policyEffectiveDate}
              </p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Data de Aceite</p>
              <p className="text-slate-900 font-medium">
                {new Date(acceptance.acceptedAt).toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Aceito por</p>
              <p className="text-slate-900 font-medium">
                {acceptance.user?.name || 'N/A'}
              </p>
              <p className="text-slate-500 text-xs">
                {acceptance.user?.email || ''}
              </p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Endereço IP</p>
              <p className="text-slate-900 font-mono text-xs">
                {acceptance.ipAddress}
              </p>
            </div>
          </div>

          <Separator className="bg-slate-200" />

          {/* Declarações LGPD */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-3">
              Declarações LGPD Registradas
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {acceptance.lgpdIsDataController ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm text-slate-700">
                  A ILPI é Controladora de Dados (art. 5º, VI, LGPD)
                </span>
                <Badge
                  variant={
                    acceptance.lgpdIsDataController ? 'default' : 'destructive'
                  }
                  className="ml-auto"
                >
                  {acceptance.lgpdIsDataController ? 'Declarado' : 'Não declarado'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {acceptance.lgpdHasLegalBasis ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm text-slate-700">
                  Possui base legal para tratamento de dados (arts. 7º e 11, LGPD)
                </span>
                <Badge
                  variant={
                    acceptance.lgpdHasLegalBasis ? 'default' : 'destructive'
                  }
                  className="ml-auto"
                >
                  {acceptance.lgpdHasLegalBasis ? 'Declarado' : 'Não declarado'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {acceptance.lgpdAcknowledgesResponsibility ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm text-slate-700">
                  Reconhece responsabilidades como Controladora
                </span>
                <Badge
                  variant={
                    acceptance.lgpdAcknowledgesResponsibility
                      ? 'default'
                      : 'destructive'
                  }
                  className="ml-auto"
                >
                  {acceptance.lgpdAcknowledgesResponsibility
                    ? 'Declarado'
                    : 'Não declarado'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-200" />

          {/* Conteúdo da Política */}
          <div>
            <p className="text-slate-500 text-sm mb-3">
              Conteúdo Completo (Snapshot no momento do aceite)
            </p>
            <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 prose prose-sm max-w-none max-h-96 overflow-y-auto">
              <ReactMarkdown>{acceptance.policyContent}</ReactMarkdown>
            </div>
          </div>

          {/* User Agent */}
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer hover:text-slate-700">
              Informações técnicas do navegador
            </summary>
            <p className="mt-2 font-mono bg-slate-100 p-2 rounded break-all">
              {acceptance.userAgent}
            </p>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  )
}
