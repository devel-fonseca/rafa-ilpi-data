// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - InfoCard (Painel do Residente)
// ──────────────────────────────────────────────────────────────────────────────

interface InfoCardProps {
  label: string
  value: React.ReactNode
}

export function InfoCard({ label, value }: InfoCardProps) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className="text-base font-medium">{value}</div>
    </div>
  )
}
