import { Building2, FileText, CheckCircle, Clock, ArrowRight, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface WelcomeScreenProps {
  tenantName: string
  onStart: () => void
}

/**
 * Tela de boas-vindas do onboarding
 * Primeira tela que o usuário vê após login
 * Explica os próximos passos e tempo estimado
 */
export function WelcomeScreen({ tenantName, onStart }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full shadow-xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <div>
            <CardTitle className="text-3xl mb-2">
              Bem-vindo ao Rafa ILPI! 🎉
            </CardTitle>
            <CardDescription className="text-lg">
              {tenantName}
            </CardDescription>
          </div>
          <p className="text-muted-foreground">
            Estamos muito felizes em ter você conosco! Vamos configurar sua instituição em apenas alguns passos.
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Próximos passos */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xl font-semibold">Próximos Passos</h3>
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                ~5 minutos
              </Badge>
            </div>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4 items-start p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">1. Perfil Institucional</h4>
                  <p className="text-sm text-muted-foreground">
                    Informações básicas sobre sua instituição: natureza jurídica, capacidade, regulamentações e identidade visual.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    📝 Apenas a <strong>natureza jurídica</strong> é obrigatória, o restante é opcional
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 items-start p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">2. Estrutura Física</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure edifícios, andares, quartos e leitos automaticamente com nosso gerador inteligente.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    🏗️ Você pode <strong>pular esta etapa</strong> e criar manualmente depois
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 items-start p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">3. Pronto para Usar!</h4>
                  <p className="text-sm text-muted-foreground">
                    Após a configuração, você terá acesso completo ao sistema para começar a gerenciar residentes, usuários e muito mais.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Informação adicional */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Personalize sua instituição
                </p>
                <p className="text-sm text-muted-foreground">
                  Adicione seu logo, defina capacidades e configure tudo do seu jeito. Todas as informações podem ser editadas depois nas configurações.
                </p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center pt-6">
          <Button
            onClick={onStart}
            size="lg"
            className="gap-2 px-8"
          >
            Começar Configuração
            <ArrowRight className="h-5 w-5" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
