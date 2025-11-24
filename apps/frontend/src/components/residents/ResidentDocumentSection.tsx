interface ResidentDocumentSectionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container Premium para cada seção do ResidentDocument.
 * Mantém espaçamento elegante, evita quebras abruptas e
 * exibe a seção mesmo quando vazia (segundo preferência do Dr. E.).
 */
export default function ResidentDocumentSection({
  children,
  className = "",
}: ResidentDocumentSectionProps) {
  return (
    <section
      className={`
        mb-8
        print-avoid-break
        ${className}
      `}
    >
      {children}
      <hr className="mt-4" />
    </section>
  );
}
