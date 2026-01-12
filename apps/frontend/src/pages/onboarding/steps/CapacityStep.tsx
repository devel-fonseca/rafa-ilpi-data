import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { OnboardingFormData } from "../OnboardingWizard";

interface CapacityStepProps {
  data: OnboardingFormData;
  onUpdate: (data: Partial<OnboardingFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

/**
 * Step 2: Capacidade e Regulatório
 * Todos os campos são opcionais
 * - cnesCode
 * - capacityDeclared
 * - capacityLicensed
 * - notes
 */
export function CapacityStep({
  data,
  onUpdate,
  onNext,
  onBack,
  isSubmitting,
}: CapacityStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação: capacityLicensed ≤ capacityDeclared
    if (
      data.capacityDeclared &&
      data.capacityLicensed &&
      data.capacityLicensed > data.capacityDeclared
    ) {
      alert(
        "A capacidade licenciada não pode ser maior que a capacidade declarada"
      );
      return;
    }

    onNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                Capacidade e Regulatório
              </CardTitle>
              <CardDescription>Passo 2 de 3 - Dados Opcionais</CardDescription>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-2/3 transition-all duration-300" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Código CNES (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="cnesCode">Código CNES</Label>
            <Input
              id="cnesCode"
              type="text"
              placeholder="Ex: 1234567"
              value={data.cnesCode || ""}
              onChange={(e) => onUpdate({ cnesCode: e.target.value })}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              Cadastro Nacional de Estabelecimentos de Saúde (7 dígitos)
            </p>
          </div>

          {/* Capacidade Declarada (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="capacityDeclared">Capacidade Declarada</Label>
            <Input
              id="capacityDeclared"
              type="number"
              min="1"
              placeholder="Ex: 50"
              value={data.capacityDeclared || ""}
              onChange={(e) =>
                onUpdate({
                  capacityDeclared: e.target.value
                    ? parseInt(e.target.value, 10)
                    : undefined,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Número total de leitos que a instituição possui
            </p>
          </div>

          {/* Capacidade Licenciada (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="capacityLicensed">Capacidade Licenciada</Label>
            <Input
              id="capacityLicensed"
              type="number"
              min="1"
              placeholder="Ex: 45"
              value={data.capacityLicensed || ""}
              onChange={(e) =>
                onUpdate({
                  capacityLicensed: e.target.value
                    ? parseInt(e.target.value, 10)
                    : undefined,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Número de leitos autorizados pela vigilância sanitária
            </p>
          </div>

          {/* Validação visual */}
          {data.capacityDeclared &&
            data.capacityLicensed &&
            data.capacityLicensed > data.capacityDeclared && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ A capacidade licenciada não pode ser maior que a capacidade
                  declarada
                </p>
              </div>
            )}

          {/* Notas/Observações (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas/Observações</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Instituição especializada em cuidados geriátricos"
              value={data.notes || ""}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Informações adicionais sobre a instituição
            </p>
          </div>

          {/* Aviso sobre campos opcionais */}
          <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 <strong>Todos os campos são opcionais.</strong> Você pode
              preencher essas informações depois acessando o Perfil
              Institucional.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <Button
            type="submit"
            disabled={
              isSubmitting ||
              (data.capacityDeclared &&
                data.capacityLicensed &&
                data.capacityLicensed > data.capacityDeclared)
            }
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
