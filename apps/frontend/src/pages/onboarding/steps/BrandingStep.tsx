import { useState } from "react";
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
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { OnboardingFormData } from "../OnboardingWizard";
import { toast } from "sonner";

interface BrandingStepProps {
  data: OnboardingFormData;
  onUpdate: (data: Partial<OnboardingFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  logoFile: File | null;
  onLogoFileChange: (file: File | null) => void;
}

/**
 * Step 3: Identidade Visual e Valores
 * Todos os campos são opcionais
 * - logo (upload de imagem)
 * - mission
 * - vision
 * - values
 */
export function BrandingStep({
  data,
  onUpdate,
  onNext,
  onBack,
  isSubmitting,
  logoFile,
  onLogoFileChange,
}: BrandingStepProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG, WebP ou PDF");
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Tamanho máximo: 10MB");
      return;
    }

    // Guardar arquivo para upload posterior (ao clicar em "Finalizar Perfil")
    onLogoFileChange(file);

    // Gerar preview se for imagem
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Identidade e Valores</CardTitle>
              <CardDescription>Passo 3 de 3 - Dados Opcionais</CardDescription>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-full transition-all duration-300" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label htmlFor="logo">Logo Institucional</Label>
            <div className="flex items-center gap-4">
              {/* Preview do logo */}
              {logoPreview ? (
                <div className="w-24 h-24 rounded-lg border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
                  <img
                    src={logoPreview}
                    alt="Preview do logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted bg-muted/30 flex items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                </div>
              )}

              {/* Botão de upload */}
              <div className="flex-1 space-y-2">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 inline-flex">
                    <Upload className="h-4 w-4" />
                    {logoFile ? "Trocar logo" : "Selecionar logo"}
                  </div>
                </Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WebP ou PDF. Tamanho máximo: 10MB
                  {logoFile && (
                    <span className="block text-primary font-medium mt-1">
                      Arquivo selecionado: {logoFile.name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Missão (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="mission">Missão Institucional</Label>
            <Textarea
              id="mission"
              placeholder="Ex: Proporcionar cuidado humanizado e qualidade de vida aos nossos residentes"
              value={data.mission || ""}
              onChange={(e) => onUpdate({ mission: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Propósito e razão de ser da instituição
            </p>
          </div>

          {/* Visão (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="vision">Visão Institucional</Label>
            <Textarea
              id="vision"
              placeholder="Ex: Ser referência em cuidados geriátricos humanizados e gestão responsável"
              value={data.vision || ""}
              onChange={(e) => onUpdate({ vision: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Onde a instituição quer chegar no futuro
            </p>
          </div>

          {/* Valores (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="values">Valores Institucionais</Label>
            <Textarea
              id="values"
              placeholder="Ex: Cuidado humanizado, segurança e compromisso profissional"
              value={data.values || ""}
              onChange={(e) => onUpdate({ values: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Princípios que guiam a instituição
            </p>
          </div>

          {/* Aviso sobre campos opcionais */}
          <div className="bg-info/10 rounded-lg p-4 border border-info/20">
            <p className="text-sm text-info-foreground">
              💡 <strong>Todos os campos são opcionais.</strong> Você pode
              adicionar essas informações depois acessando o Perfil
              Institucional.
            </p>
          </div>

          {/* Aviso de finalização */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm font-medium">
              🎉 Ao clicar em "Finalizar", seu perfil institucional será criado
              e você poderá configurar a estrutura física da instituição.
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

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                Finalizar Perfil
                <Sparkles className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
