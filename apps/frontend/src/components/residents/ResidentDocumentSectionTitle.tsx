interface ResidentDocumentSectionTitleProps {
  children: React.ReactNode;
}

export default function ResidentDocumentSectionTitle({
  children,
}: ResidentDocumentSectionTitleProps) {
  return (
    <h2
      className="
        text-xl font-semibold text-gray-900 mb-2
        border-b border-gray-300 pb-1
        print-avoid-break print-no-bottom-border
      "
    >
      {children}
    </h2>
  );
}
