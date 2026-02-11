// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - ShiftNotesEditor (Editor de Notas do Plantão)
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUpdateShiftNotes } from '@/hooks/care-shifts/useShifts';

interface ShiftNotesEditorProps {
  shiftId: string;
  initialNotes?: string | null;
  disabled?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 2000;

/**
 * Editor de notas do plantão com auto-save
 *
 * Permite que o líder/suplente registre observações durante o turno.
 * Salva automaticamente após 2 segundos de inatividade.
 */
export function ShiftNotesEditor({
  shiftId,
  initialNotes,
  disabled = false,
}: ShiftNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const updateNotes = useUpdateShiftNotes();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincronizar com props quando mudar externamente
  useEffect(() => {
    setNotes(initialNotes ?? '');
  }, [initialNotes]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Função de save
  const saveNotes = useCallback(
    async (value: string) => {
      if (disabled) return;

      setSaveStatus('saving');
      try {
        await updateNotes.mutateAsync({
          shiftId,
          notes: value || undefined,
        });
        setSaveStatus('saved');
        // Resetar status após 3 segundos
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch {
        setSaveStatus('error');
      }
    },
    [shiftId, updateNotes, disabled],
  );

  const handleChange = (value: string) => {
    setNotes(value);
    if (disabled) return;

    setSaveStatus('idle');

    // Cancelar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Agendar novo save
    timeoutRef.current = setTimeout(() => {
      saveNotes(value);
    }, DEBOUNCE_MS);
  };

  const getStatusIndicator = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Salvando...
          </span>
        );
      case 'saved':
        return (
          <span className="flex items-center gap-1 text-xs text-success">
            <Check className="h-3 w-3" />
            Salvo
          </span>
        );
      case 'error':
        return (
          <span className="text-xs text-destructive">
            Erro ao salvar
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label
          htmlFor="shift-notes"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Ocorrências do Turno
        </Label>
        {getStatusIndicator()}
      </div>
      <Textarea
        id="shift-notes"
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Registre intercorrências, alertas e informações importantes para a próxima equipe..."
        disabled={disabled}
        rows={4}
        className="resize-y min-h-[100px] text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Tudo que a próxima equipe precisa saber. Salvo automaticamente e pré-preenchido na passagem de plantão.
      </p>
    </div>
  );
}
