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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import { OnboardingFormData } from "../OnboardingWizard";

interface BasicInfoStepProps {
  data: OnboardingFormData;
  onUpdate: (data: Partial<OnboardingFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

/**
 * Step 1: Dados Básicos
 * - legalNature (OBRIGATÓRIO) ✅
 * - tradeName (opcional)
 * - foundedAt (opcional)
 * - websiteUrl (opcional)
 * - contactPhone (opcional)
 * - contactEmail (opcional)
 */
export function BasicInfoStep({
  data,
  onUpdate,
  onNext,
  onBack,
  isSubmitting,
}: BasicInfoStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação: legalNature é obrigatório
    if (!data.legalNature) {
      alert("Por favor, selecione a natureza jurídica da instituição");
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
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Perfil Institucional</CardTitle>
              <CardDescription>Passo 1 de 3 - Dados Básicos</CardDescription>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-1/3 transition-all duration-300" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Natureza Jurídica (OBRIGATÓRIO) */}
          <div className="space-y-2">
            <Label htmlFor="legalNature" className="flex items-center gap-2">
              Natureza Jurídica <span className="text-destructive">*</span>
            </Label>
            <Select
              value={data.legalNature || ""}
              onValueChange={(value) => onUpdate({ legalNature: value as any })}
              required
            >
              <SelectTrigger id="legalNature">
                <SelectValue placeholder="Selecione a natureza jurídica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASSOCIACAO">
                  Associação sem fins lucrativos
                </SelectItem>
                <SelectItem value="FUNDACAO">Fundação privada</SelectItem>
                <SelectItem value="EMPRESA_PRIVADA">Empresa privada</SelectItem>
                <SelectItem value="MEI">
                  Microempreendedor Individual (MEI)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Campo obrigatório</p>
          </div>

          {/* Nome Fantasia (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="tradeName">Nome Fantasia</Label>
            <Input
              id="tradeName"
              type="text"
              placeholder="Ex: Casa de Repouso Feliz Idade"
              value={data.tradeName || ""}
              onChange={(e) => onUpdate({ tradeName: e.target.value })}
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground">
              Opcional - como sua instituição é conhecida
            </p>
          </div>

          {/* Data de Fundação (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="foundedAt">Data de Fundação</Label>
            <Input
              id="foundedAt"
              type="date"
              value={data.foundedAt || ""}
              onChange={(e) => onUpdate({ foundedAt: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Opcional</p>
          </div>

          {/* Website (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website</Label>
            <Input
              id="websiteUrl"
              type="url"
              placeholder="https://www.exemplo.com.br"
              value={data.websiteUrl || ""}
              onChange={(e) => onUpdate({ websiteUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Opcional</p>
          </div>

          {/* Telefone (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Telefone Institucional</Label>
            <Input
              id="contactPhone"
              type="tel"
              placeholder="(11) 98765-4321"
              value={data.contactPhone || ""}
              onChange={(e) => onUpdate({ contactPhone: e.target.value })}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">Opcional</p>
          </div>

          {/* Email (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email Institucional</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="contato@instituicao.com.br"
              value={data.contactEmail || ""}
              onChange={(e) => onUpdate({ contactEmail: e.target.value })}
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground">Opcional</p>
          </div>

          {/* Aviso sobre campos opcionais */}
          <div className="bg-info/10 rounded-lg p-4 border border-info/20">
            <p className="text-sm text-info-foreground">
              💡{" "}
              <strong>A indicação da natureza jurídica da instituição é obrigatória.</strong>{" "}
              Os demais campos podem ser preenchidos depois acessando o Perfil
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

          <Button type="submit" disabled={isSubmitting || !data.legalNature}>
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
