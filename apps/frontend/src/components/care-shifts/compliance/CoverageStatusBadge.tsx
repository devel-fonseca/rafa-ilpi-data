// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - CoverageStatusBadge (Badge de Status de Conformidade RDC)
// ──────────────────────────────────────────────────────────────────────────────

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import type { ComplianceStatus } from '@/types/care-shifts/rdc-calculation';

interface CoverageStatusBadgeProps {
  assignedCount: number;
  minimumRequired: number;
  showIcon?: boolean;
  showCount?: boolean;
}

/**
 * Determina o status de conformidade baseado no número de cuidadores
 * 🟢 compliant: assignedCount >= minimumRequired
 * 🟡 attention: 0 < assignedCount < minimumRequired
 * 🔴 non_compliant: assignedCount === 0
 */
function getComplianceStatus(
  assignedCount: number,
  minimumRequired: number,
): ComplianceStatus {
  if (assignedCount === 0) return 'non_compliant';
  if (assignedCount < minimumRequired) return 'attention';
  return 'compliant';
}

/**
 * Badge visual para indicar status de conformidade RDC
 */
export function CoverageStatusBadge({
  assignedCount,
  minimumRequired,
  showIcon = true,
  showCount = true,
}: CoverageStatusBadgeProps) {
  const status = getComplianceStatus(assignedCount, minimumRequired);

  const config = {
    compliant: {
      label: 'Conforme',
      variant: 'default' as const,
      className: 'bg-success text-success-foreground hover:bg-success/90',
      icon: CheckCircle2,
    },
    attention: {
      label: 'Atenção',
      variant: 'secondary' as const,
      className: 'bg-warning text-warning-foreground hover:bg-warning/90',
      icon: AlertCircle,
    },
    non_compliant: {
      label: 'Não Conforme',
      variant: 'destructive' as const,
      className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      icon: XCircle,
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <Badge className={className}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {label}
      {showCount && (
        <span className="ml-1 font-semibold">
          ({assignedCount}/{minimumRequired})
        </span>
      )}
    </Badge>
  );
}
