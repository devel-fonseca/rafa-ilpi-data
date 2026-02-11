// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - CheckInButton (Botão de Check-in do Plantão)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCheckInShift } from '@/hooks/care-shifts';
import type { Shift, ShiftStatus } from '@/types/care-shifts/care-shifts';

interface CheckInButtonProps {
  shift: Shift;
  disabled?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  onSuccess?: () => void;
}

/**
 * Botão de check-in para iniciar o plantão (CONFIRMED → IN_PROGRESS)
 * Apenas Líder ou Suplente podem fazer check-in
 */
export function CheckInButton({
  shift,
  disabled = false,
  size = 'default',
  variant = 'default',
  onSuccess,
}: CheckInButtonProps) {
  const [open, setOpen] = useState(false);
  const checkIn = useCheckInShift();

  // Só mostra o botão se o plantão estiver CONFIRMED
  if (shift.status !== ('CONFIRMED' as ShiftStatus)) {
    return null;
  }

  const handleCheckIn = async () => {
    try {
      await checkIn.mutateAsync(shift.id);
      setOpen(false);
      onSuccess?.();
    } catch {
      // Erro já tratado pelo hook com toast
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || checkIn.isPending}
          className="gap-2"
        >
          {checkIn.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          Iniciar Plantão
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Check-in</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você está prestes a iniciar o plantão{' '}
              <strong>{shift.shiftTemplate?.name}</strong>.
            </p>
            <p>
              Após o check-in, o plantão mudará para o status{' '}
              <strong className="text-success">Em Andamento</strong> e você
              será responsável pelos registros deste turno.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={checkIn.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCheckIn}
            disabled={checkIn.isPending}
            className="gap-2"
          >
            {checkIn.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Confirmar Check-in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
