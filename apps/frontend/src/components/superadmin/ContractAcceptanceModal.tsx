import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { ContractAcceptance } from '@/api/contracts.api'

interface ContractAcceptanceModalProps {
  acceptance: ContractAcceptance | null
  open: boolean
  onClose: () => void
}

export function ContractAcceptanceModal({
  acceptance,
  open,
  onClose,
}: ContractAcceptanceModalProps) {
  if (!acceptance) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Contrato Aceito</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Informações Principais */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 mb-1">Versão do Contrato</p>
              <p className="text-slate-900 font-medium">
                {acceptance.contractVersion}
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

          {/* Título e Conteúdo */}
          <div>
            <p className="text-slate-500 text-sm mb-2">Título do Contrato</p>
            <p className="text-slate-900 font-medium text-lg mb-6">
              {acceptance.contract?.title || 'Contrato de Prestação de Serviços'}
            </p>

            <p className="text-slate-500 text-sm mb-3">Conteúdo Completo</p>
            <div
              className="p-6 bg-slate-50 rounded-lg border border-slate-200 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: acceptance.contractContent }}
            />
          </div>

          <Separator className="bg-slate-200" />

          {/* Hash SHA-256 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-900 mb-2">
              <strong>Hash SHA-256 (Prova de Integridade):</strong>
            </p>
            <p className="text-xs font-mono break-all text-blue-800 bg-blue-100 p-2 rounded">
              {acceptance.contractHash}
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Este hash criptográfico garante que o conteúdo do contrato aceito
              não foi alterado desde o momento da aceitação, servindo como prova
              jurídica de integridade.
            </p>
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
