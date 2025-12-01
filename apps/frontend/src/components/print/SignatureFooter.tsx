interface SignatureFooterProps {
  /**
   * Título da assinatura (ex: "RESPONSÁVEL TÉCNICO", "MÉDICO PRESCRITOR")
   */
  signatureTitle?: string
  /**
   * Se deve incluir campo de data
   */
  includeDate?: boolean
  /**
   * Classe CSS adicional para o container
   */
  className?: string
}

/**
 * Componente de rodapé com campo de assinatura para documentos impressos
 *
 * @example
 * ```tsx
 * <SignatureFooter
 *   signatureTitle="RESPONSÁVEL TÉCNICO"
 *   includeDate={true}
 * />
 * ```
 */
export function SignatureFooter({
  signatureTitle = 'RESPONSÁVEL TÉCNICO',
  includeDate = true,
  className = '',
}: SignatureFooterProps) {
  return (
    <div className={`print-only mt-8 pt-4 border-t-2 border-gray-300 ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold">
            ASSINATURA DO {signatureTitle}:
            <br />
            <br />
            _________________________________
          </p>
        </div>
        {includeDate && (
          <div>
            <p className="text-sm font-semibold">
              DATA:
              <br />
              <br />
              _______________
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
