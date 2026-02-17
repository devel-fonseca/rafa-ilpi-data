// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - HandoverDialog (Dialog de Passagem de Plantão)
// ──────────────────────────────────────────────────────────────────────────────

import { useState, type MouseEvent } from 'react';
import { FileText, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHandoverShift } from '@/hooks/care-shifts';
import { getHandoverReportTemplate } from '@/api/care-shifts';
import { useReauthentication } from '@/hooks/useReauthentication';
import { ReauthenticationModal } from '@/components/ReauthenticationModal';
import type { Shift, ShiftStatus } from '@/types/care-shifts/care-shifts';

interface HandoverDialogProps {
  shift: Shift;
  disabled?: boolean;
  onSuccess?: () => void;
}

const MIN_REPORT_LENGTH = 50;

/**
 * Dialog para realizar a passagem de plantão
 * Apenas Líder ou Suplente podem fazer handover
 * Relatório mínimo de 50 caracteres é obrigatório
 */
export function HandoverDialog({
  shift,
  disabled = false,
  onSuccess,
}: HandoverDialogProps) {
  const [open, setOpen] = useState(false);
  // Pré-preencher com notas existentes do plantão
  const [report, setReport] = useState(shift.notes ?? '');
  const handover = useHandoverShift();
  const {
    isModalOpen: isReauthModalOpen,
    openReauthModal,
    closeReauthModal,
    reauthenticate,
    isReauthenticating,
    reauthError,
  } = useReauthentication();

  // Só mostra o botão se o plantão estiver IN_PROGRESS
  if (shift.status !== ('IN_PROGRESS' as ShiftStatus)) {
    return null;
  }

  const isReportValid = report.trim().length >= MIN_REPORT_LENGTH;
  const remainingChars = MIN_REPORT_LENGTH - report.trim().length;

  const handleHandover = async () => {
    if (!isReportValid) return;

    try {
      await handover.mutateAsync({
        shiftId: shift.id,
        data: {
          report: report.trim(),
        },
      });
      setOpen(false);
      setReport('');
      onSuccess?.();
    } catch (error) {
      const errorData = (error as { response?: { data?: { code?: string; requiresReauth?: boolean } } })
        .response?.data;
      const requiresReauth =
        errorData?.code === 'REAUTHENTICATION_REQUIRED' ||
        errorData?.requiresReauth;

      if (requiresReauth) {
        openReauthModal(() => {
          void handleHandover();
        });
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Mantém o prefill com notas do plantão ao reabrir, reduzindo retrabalho.
      setReport(shift.notes ?? '');
    }
  };

  const handleReportLabelClick = async (
    e: MouseEvent<HTMLLabelElement>,
  ) => {
    if (!e.ctrlKey) return;

    try {
      const template = await getHandoverReportTemplate();
      setReport(template);
    } catch {
      toast.error('Não foi possível carregar o texto modelo.');
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || handover.isPending}
          className="gap-2"
        >
          {handover.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Finalizar Plantão
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Passagem de Plantão</DialogTitle>
          <DialogDescription>
            Registre as informações importantes do turno para a equipe seguinte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info do plantão */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm">
              <strong>Plantão:</strong> {shift.shiftTemplate?.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {shift.shiftTemplate?.startTime} - {shift.shiftTemplate?.endTime}
            </p>
          </div>

          {/* Relatório */}
          <div className="space-y-2">
            <Label
              htmlFor="report"
              onClick={handleReportLabelClick}
            >
              Relatório da Passagem <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="report"
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="Descreva os eventos importantes do turno, intercorrências, pendências para a próxima equipe..."
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Mínimo de {MIN_REPORT_LENGTH} caracteres
              </span>
              <span
                className={
                  isReportValid ? 'text-success' : 'text-muted-foreground'
                }
              >
                {report.trim().length} / {MIN_REPORT_LENGTH}
                {remainingChars > 0 && ` (faltam ${remainingChars})`}
              </span>
            </div>
          </div>

          {/* Aviso */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Após a passagem de plantão, o status será alterado para{' '}
              <strong>Concluído</strong> e você não poderá mais fazer registros
              neste turno.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={handover.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleHandover}
            disabled={!isReportValid || handover.isPending}
            className="gap-2"
          >
            {handover.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Confirmar Passagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ReauthenticationModal
      open={isReauthModalOpen}
      onOpenChange={closeReauthModal}
      onSubmit={reauthenticate}
      isLoading={isReauthenticating}
      error={reauthError}
      actionDescription="Passagem de plantão"
      alertDescription="Você está prestes a registrar a passagem de plantão, formalizando a transmissão das informações assistenciais ao próximo turno. Para garantir a rastreabilidade e a segurança dos registros, confirme sua senha para continuar."
      fieldLabel="Digite sua senha para confirmar sua identidade"
      submitLabel="Confirmar e registrar passagem"
      infoTitle="ℹ️ Por que preciso confirmar minha identidade?"
      infoDescription="A passagem de plantão é um registro institucional que assegura a continuidade do cuidado e a rastreabilidade das informações assistenciais. Sua confirmação vincula este registro à sua autoria profissional."
    />
    </>
  );
}
