import { Link } from 'react-router-dom'
import { Lock, Zap, Mail } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface UpgradePlanCardProps {
  featureName: string
  currentPlan: string
  planType?: string
}

/**
 * Componente de bloqueio de feature com card de upgrade
 *
 * Exibe mensagem informando que a feature não está disponível no plano atual
 * e oferece opções de upgrade baseadas no tipo de plano:
 * - Free/Básico: Self-service (botão direto para /settings/billing)
 * - Profissional/Enterprise: Contato com vendas (/contact-sales)
 *
 * @example
 * ```tsx
 * <UpgradePlanCard
 *   featureName="Eventos Sentinela"
 *   currentPlan="Básico"
 *   planType="BASICO"
 * />
 * ```
 */
export function UpgradePlanCard({
  featureName,
  currentPlan,
  planType = 'FREE',
}: UpgradePlanCardProps) {
  // Free/Básico → Self-service (botão direto)
  const isSelfService = ['FREE', 'BASICO'].includes(planType.toUpperCase())

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Lock className="h-6 w-6 text-gray-600" />
          </div>
          <CardTitle>Recurso Bloqueado</CardTitle>
          <CardDescription>
            O recurso <strong>{featureName}</strong> não está disponível no seu
            plano atual <strong>({currentPlan})</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSelfService ? (
            // Self-service: Botão direto para billing
            <>
              <p className="text-sm text-gray-600 text-center">
                Faça upgrade para um plano superior e desbloqueie este e outros
                recursos avançados.
              </p>
              <Button asChild className="w-full">
                <Link to="/settings/billing">
                  <Zap className="mr-2 h-4 w-4" />
                  Fazer Upgrade
                </Link>
              </Button>
            </>
          ) : (
            // Enterprise: Contato com vendas
            <>
              <p className="text-sm text-gray-600 text-center">
                Entre em contato com nossa equipe para adicionar este recurso ao
                seu plano.
              </p>
              <Button asChild variant="default" className="w-full">
                <a href="mailto:contato@rafalabs.com.br">
                  <Mail className="mr-2 h-4 w-4" />
                  Falar com Vendas
                </a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
