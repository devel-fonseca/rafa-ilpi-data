// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - AdminCloseShiftDialog (Encerramento Administrativo)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
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
import { useAdminCloseShift } from '@/hooks/care-shifts';
import type { Shift } from '@/types/care-shifts/care-shifts';

interface AdminCloseShiftDialogProps {
  shift: Shift;
  disabled?: boolean;
  onSuccess?: () => void;
  triggerLabel?: string;
  triggerClassName?: string;
}

const MIN_REASON_LENGTH = 10;

/**
 * Encerramento administrativo para RT/Admin.
 *
 * Tradeoff: usa o endpoint de admin-close e exige justificativa textual
 * para manter trilha auditável sem adicionar nova entidade no banco.
 */
export function AdminCloseShiftDialog({
  shift,
  disabled = false,
  onSuccess,
  triggerLabel = 'Resolver',
  triggerClassName,
}: AdminCloseShiftDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const adminClose = useAdminCloseShift();

  const isReasonValid = reason.trim().length >= MIN_REASON_LENGTH;
  const remainingChars = MIN_REASON_LENGTH - reason.trim().length;

  const handleClose = async () => {
    if (!isReasonValid) return;

    try {
      await adminClose.mutateAsync({
        shiftId: shift.id,
        reason: reason.trim(),
      });
      setOpen(false);
      setReason('');
      onSuccess?.();
    } catch {
      // Erro já tratado pelo hook com toast
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setReason('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={disabled || adminClose.isPending}
          className={triggerClassName}
        >
          {adminClose.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : null}
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Encerramento Administrativo</DialogTitle>
          <DialogDescription>
            Finalize este plantão com justificativa formal quando a equipe não realizar a passagem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-sm">
              <strong>Plantão:</strong> {shift.team?.name || 'Equipe'} • {shift.shiftTemplate?.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {shift.shiftTemplate?.startTime} - {shift.shiftTemplate?.endTime}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-close-reason">
              Relatório / justificativa <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="admin-close-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do encerramento administrativo e as observações relevantes para auditoria."
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Mínimo de {MIN_REASON_LENGTH} caracteres
              </span>
              <span className={isReasonValid ? 'text-success' : 'text-muted-foreground'}>
                {reason.trim().length} / {MIN_REASON_LENGTH}
                {remainingChars > 0 && ` (faltam ${remainingChars})`}
              </span>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta ação altera o status para <strong>Encerrado Administrativamente</strong> e registra
              o texto informado no relatório de passagem.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={adminClose.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleClose}
            disabled={!isReasonValid || adminClose.isPending}
            className="gap-2"
          >
            {adminClose.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Encerrar Administrativamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
