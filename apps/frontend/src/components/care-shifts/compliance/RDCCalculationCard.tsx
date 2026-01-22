// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - RDCCalculationCard (Card Explicativo do Cálculo RDC)
// ──────────────────────────────────────────────────────────────────────────────

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SeverityAlert } from '@/design-system/components';
import { formatDateOnlySafe } from '@/utils/dateHelpers';
import type { RDCCalculationResult } from '@/types/care-shifts/rdc-calculation';

interface RDCCalculationCardProps {
  calculation: RDCCalculationResult | undefined;
  isLoading?: boolean;
}

export function RDCCalculationCard({
  calculation,
  isLoading,
}: RDCCalculationCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cálculo RDC 502/2021</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!calculation) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cálculo RDC 502/2021</CardTitle>
        <CardDescription>
          Mínimo de cuidadores exigido para {formatDateOnlySafe(calculation.date)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {calculation.calculations.map((calc) => (
          <div key={calc.shiftTemplate.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{calc.shiftTemplate.name}</h4>
              <Badge variant="secondary" className="text-base font-bold">
                {calc.minimumRequired} {calc.minimumRequired === 1 ? 'cuidador' : 'cuidadores'}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium text-muted-foreground">Residentes:</p>
              <ul className="space-y-1 pl-4">
                <li>Grau I: {calc.residents.grauI} residentes → {Math.ceil(calc.residents.grauI / (calc.shiftTemplate.duration === 8 ? 20 : 10))} cuidador(es)</li>
                <li>Grau II: {calc.residents.grauII} residentes → {Math.ceil(calc.residents.grauII / 10)} cuidador(es)</li>
                <li>Grau III: {calc.residents.grauIII} residentes → {Math.ceil(calc.residents.grauIII / 6)} cuidador(es)</li>
              </ul>
            </div>
          </div>
        ))}

        {calculation.warnings && calculation.warnings.length > 0 && (
          <SeverityAlert
            severity="warning"
            title="Cálculo RDC Parcial"
            message={calculation.warnings.join(' ')}
          />
        )}
      </CardContent>
    </Card>
  );
}
