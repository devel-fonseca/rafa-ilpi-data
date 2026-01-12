import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, CheckCircle2, ArrowRight, SkipForward, Lightbulb, AlertTriangle } from 'lucide-react'

interface StructureGeneratorInstructionsProps {
  onProceed: () => void
  onSkip: () => void
}

/**
 * Tela de instruções para uso do BuildingStructureGenerator
 * Exibida após o wizard de perfil, antes de abrir o gerador
 */
export function StructureGeneratorInstructions({
  onProceed,
  onSkip,
}: StructureGeneratorInstructionsProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full shadow-xl">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <div>
            <CardTitle className="text-3xl mb-2">
              Estrutura Física da Instituição
            </CardTitle>
            <CardDescription className="text-lg">
              Configure edifícios, andares, quartos e leitos automaticamente
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* O que é */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              O que é o Gerador de Estrutura?
            </h3>
            <p className="text-muted-foreground">
              Uma ferramenta inteligente que cria automaticamente toda a hierarquia de leitos
              da sua instituição: <strong>Edifícios → Andares → Quartos → Leitos</strong>
            </p>
          </div>

          {/* Como funciona */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Como funciona?</h3>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium">Defina os edifícios</p>
                  <p className="text-sm text-muted-foreground">
                    Quantos prédios/alas sua instituição possui? (Ex: Bloco A, Clínica 1)
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium">Configure andares e quartos</p>
                  <p className="text-sm text-muted-foreground">
                    Para cada edifício, defina quantos andares e quartos por andar
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium">Defina leitos por quarto</p>
                  <p className="text-sm text-muted-foreground">
                    Configure quantos leitos existem em cada tipo de quarto
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-sm font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Pronto!</p>
                  <p className="text-sm text-muted-foreground">
                    Todos os leitos são criados automaticamente com códigos únicos
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Exemplo de códigos */}
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <strong>Exemplo de códigos gerados:</strong>
              <div className="mt-2 font-mono text-sm space-y-1">
                <div>CLI6-823-A (Clínica 1, 6º andar, quarto 823, leito A)</div>
                <div>CLI6-823-B (Clínica 1, 6º andar, quarto 823, leito B)</div>
                <div>BLA2-201-A (Bloco A, 2º andar, quarto 201, leito A)</div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Pode pular */}
          <Alert variant="default">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Você pode pular esta etapa</strong> e criar a estrutura manualmente depois
              em <strong>Gestão de Leitos</strong>. Mas o gerador automático economiza muito tempo! ⚡
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex justify-between pt-6">
          <Button variant="outline" onClick={onSkip}>
            <SkipForward className="h-4 w-4 mr-2" />
            Pular por Enquanto
          </Button>

          <Button onClick={onProceed} size="lg" className="gap-2">
            Abrir Gerador
            <ArrowRight className="h-5 w-5" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
