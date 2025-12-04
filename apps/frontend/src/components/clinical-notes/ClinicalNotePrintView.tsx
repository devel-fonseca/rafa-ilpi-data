import { forwardRef } from 'react'
import { InstitutionalHeader } from '@/components/print/InstitutionalHeader'
import { SignatureFooter } from '@/components/print/SignatureFooter'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { PROFESSION_CONFIG } from '@/utils/clinicalNotesConstants'
import type { ClinicalNote } from '@/api/clinicalNotes.api'

interface ClinicalNotePrintViewProps {
  note: ClinicalNote
  residentName: string
  residentCpf?: string
}

/**
 * Componente para impressão de Evolução Clínica (SOAP)
 *
 * Layout compatível com InstitutionalHeader e SignatureFooter
 * Segue padrão de impressão da Ficha de Medicações
 */
export const ClinicalNotePrintView = forwardRef<HTMLDivElement, ClinicalNotePrintViewProps>(
  ({ note, residentName, residentCpf }, ref) => {
    const professionConfig = PROFESSION_CONFIG[note.profession]

    return (
      <div ref={ref} className="hidden print:block">
        <InstitutionalHeader
          documentTitle="EVOLUÇÃO CLÍNICA (SOAP)"
          documentSubtitle={
            <div className="text-sm space-y-1">
              <p>
                <strong>Residente:</strong> {residentName}
                {residentCpf && ` - CPF: ${residentCpf}`}
              </p>
              <p>
                <strong>Profissão:</strong> {professionConfig.icon} {professionConfig.label}
              </p>
              <p>
                <strong>Data/Hora da Evolução:</strong> {formatDateTimeSafe(note.noteDate)}
              </p>
            </div>
          }
        />

        {/* Conteúdo SOAP */}
        <div className="space-y-4 mb-6">
          {/* Subjetivo */}
          {note.subjective && (
            <div className="border-l-4 border-blue-500 pl-3">
              <h3 className="font-bold text-base mb-2">[S] SUBJETIVO</h3>
              <div className="text-sm whitespace-pre-wrap">{note.subjective}</div>
            </div>
          )}

          {/* Objetivo */}
          {note.objective && (
            <div className="border-l-4 border-green-500 pl-3">
              <h3 className="font-bold text-base mb-2">[O] OBJETIVO</h3>
              <div className="text-sm whitespace-pre-wrap">{note.objective}</div>
            </div>
          )}

          {/* Avaliação */}
          {note.assessment && (
            <div className="border-l-4 border-orange-500 pl-3">
              <h3 className="font-bold text-base mb-2">[A] AVALIAÇÃO</h3>
              <div className="text-sm whitespace-pre-wrap">{note.assessment}</div>
            </div>
          )}

          {/* Plano */}
          {note.plan && (
            <div className="border-l-4 border-purple-500 pl-3">
              <h3 className="font-bold text-base mb-2">[P] PLANO</h3>
              <div className="text-sm whitespace-pre-wrap">{note.plan}</div>
            </div>
          )}

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <p className="text-sm">
                <strong>Tags:</strong> {note.tags.join(', ')}
              </p>
            </div>
          )}

          {/* Informações de Registro */}
          <div className="mt-6 pt-4 border-t-2 border-gray-400 text-sm text-gray-700">
            <p>
              <strong>Profissional:</strong> {note.professional.name} ({note.professional.email})
            </p>
            <p>
              <strong>Registrado em:</strong> {formatDateTimeSafe(note.createdAt)}
            </p>
            {note.version > 1 && (
              <>
                <p>
                  <strong>Versão:</strong> {note.version}
                </p>
                <p>
                  <strong>Última atualização:</strong> {formatDateTimeSafe(note.updatedAt)}
                </p>
              </>
            )}
            <p className="text-xs text-gray-500 mt-2">
              <strong>ID do Documento:</strong> {note.id}
            </p>
          </div>
        </div>

        <SignatureFooter
          signatureTitle={`${professionConfig.label.toUpperCase()} RESPONSÁVEL`}
          includeDate={true}
        />

        {/* Estilos de impressão */}
        <style>{`
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            /* Quebras de página */
            .border-l-4 {
              page-break-inside: avoid;
            }

            /* Cores das bordas laterais SOAP */
            .border-blue-500 {
              border-color: #3b82f6 !important;
            }
            .border-green-500 {
              border-color: #22c55e !important;
            }
            .border-orange-500 {
              border-color: #f97316 !important;
            }
            .border-purple-500 {
              border-color: #a855f7 !important;
            }

            /* Formatação de texto */
            .whitespace-pre-wrap {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          }
        `}</style>
      </div>
    )
  }
)

ClinicalNotePrintView.displayName = 'ClinicalNotePrintView'
