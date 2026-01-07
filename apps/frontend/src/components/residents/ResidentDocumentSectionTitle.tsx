interface ResidentDocumentSectionTitleProps {
  children: React.ReactNode;
}

export default function ResidentDocumentSectionTitle({
  children,
}: ResidentDocumentSectionTitleProps) {
  return (
    <h2
      className="
        text-xl font-semibold text-foreground mb-2
        border-b border-border pb-1
        print-avoid-break print-no-bottom-border
      "
    >
      {children}
    </h2>
  );
}
