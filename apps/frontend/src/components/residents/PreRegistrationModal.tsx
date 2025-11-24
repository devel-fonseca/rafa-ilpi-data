import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AlertCircle, FileText, Download } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface PreRegistrationModalProps {
  open: boolean
  onConfirm: (lgpdConsent: boolean, imageAuthorization: boolean) => void
  onCancel: () => void
}

export function PreRegistrationModal({ open, onConfirm, onCancel }: PreRegistrationModalProps) {
  const [lgpdConsent, setLgpdConsent] = useState(false)
  const [imageAuthorization, setImageAuthorization] = useState(false)

  const handleConfirm = () => {
    if (lgpdConsent) {
      onConfirm(lgpdConsent, imageAuthorization)
      // Reset state
      setLgpdConsent(false)
      setImageAuthorization(false)
    }
  }

  const handleCancel = () => {
    setLgpdConsent(false)
    setImageAuthorization(false)
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Confirmações Obrigatórias - Pré-Cadastro</DialogTitle>
          <DialogDescription>
            Antes de iniciar o cadastro do residente, confirme os itens abaixo:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alerta Informativo */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              O consentimento LGPD é obrigatório para prosseguir. A autorização de uso de imagem é opcional.
            </AlertDescription>
          </Alert>

          {/* 1. Consentimento LGPD (Obrigatório) */}
          <div className="space-y-4 border rounded-lg p-6 bg-info/10">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="lgpdConsent"
                checked={lgpdConsent}
                onCheckedChange={(checked: boolean) => setLgpdConsent(checked)}
                className="mt-1"
              />
              <div className="space-y-2 flex-1">
                <Label htmlFor="lgpdConsent" className="text-base font-semibold cursor-pointer">
                  1. Consentimento LGPD (Obrigatório) *
                </Label>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">
                    "Confirmo que o consentimento LGPD foi obtido."
                  </p>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                    <p className="text-xs font-semibold mb-2">Declaração Jurídica:</p>
                    <p className="text-xs leading-relaxed italic text-muted-foreground">
                      Declaro que o residente ou seu responsável legal assinou o Termo de Consentimento
                      para Tratamento de Dados Pessoais, em conformidade com a Lei nº 13.709/2018 (LGPD),
                      autorizando a coleta e o tratamento dos dados necessários à assistência e à
                      administração da instituição.
                    </p>
                  </div>
                  <p className="text-xs text-danger font-medium">
                    ⚠ Esta confirmação é obrigatória para prosseguir com o cadastro.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Autorização de Uso de Imagem (Opcional) */}
          <div className="space-y-4 border rounded-lg p-6 bg-muted">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="imageAuthorization"
                checked={imageAuthorization}
                onCheckedChange={(checked: boolean) => setImageAuthorization(checked)}
                className="mt-1"
              />
              <div className="space-y-2 flex-1">
                <Label htmlFor="imageAuthorization" className="text-base font-semibold cursor-pointer">
                  2. Autorização de uso de imagem (Opcional)
                </Label>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">
                    "Autorizo o uso de imagem."
                  </p>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                    <p className="text-xs font-semibold mb-2">Declaração Jurídica:</p>
                    <p className="text-xs leading-relaxed italic text-muted-foreground">
                      Declaro que o residente ou seu responsável legal autorizou, por escrito, a captação
                      e o uso de imagens (fotos e vídeos), exclusivamente para fins de prontuário,
                      documentação institucional interna ou divulgação institucional autorizada.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ℹ Esta autorização é opcional e não impede o prosseguimento do cadastro.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Documentos para Download */}
          <div className="border rounded-lg p-4 bg-muted">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-info" />
              <h3 className="font-semibold">Modelos de Documentos</h3>
            </div>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                <Download className="h-4 w-4 mr-2" />
                Baixar Modelo de Termo LGPD (Em breve)
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                <Download className="h-4 w-4 mr-2" />
                Baixar Modelo de Autorização de Imagem (Em breve)
              </Button>
            </div>
          </div>

          {/* Informações de Auditoria */}
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <p className="font-semibold mb-1">Registro de Confirmação:</p>
            <p>
              Suas confirmações serão registradas em log com data, hora e identificação do usuário
              para fins de auditoria e conformidade legal.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!lgpdConsent}
            variant="default"
          >
            {!lgpdConsent ? 'Confirme o Consentimento LGPD' : 'Iniciar Cadastro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
