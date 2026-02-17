/* eslint-disable no-restricted-syntax */
/**
 * ReauthenticationModal
 *
 * Modal de reautenticação para operações de alto risco.
 * Solicita senha do usuário para gerar token temporário (5min).
 *
 * @module ReauthenticationModal
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Lock, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
});

type FormValues = z.infer<typeof formSchema>;

export interface ReauthenticationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string) => void;
  isLoading?: boolean;
  error?: Error | null;
  actionDescription?: string;
  alertTitle?: string;
  alertDescription?: string;
  submitLabel?: string;
  infoTitle?: string;
  infoDescription?: string;
  fieldLabel?: string;
}

/**
 * Modal de reautenticação para operações de alto risco
 *
 * **Uso:**
 * ```tsx
 * const { isModalOpen, closeReauthModal, reauthenticate, isReauthenticating, reauthError } =
 *   useReauthentication();
 *
 * <ReauthenticationModal
 *   open={isModalOpen}
 *   onOpenChange={closeReauthModal}
 *   onSubmit={reauthenticate}
 *   isLoading={isReauthenticating}
 *   error={reauthError}
 *   actionDescription="Exclusão de residente"
 * />
 * ```
 *
 * **Comportamento:**
 * - Modal não pode ser fechado clicando fora (requiresInteraction)
 * - Foco automático no campo de senha ao abrir
 * - Exibe erro se senha incorreta
 * - Mantém modal aberto para retry em caso de erro
 * - Fecha automaticamente após sucesso
 */
export function ReauthenticationModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  error = null,
  actionDescription,
  alertTitle,
  alertDescription,
  submitLabel,
  infoTitle,
  infoDescription,
  fieldLabel,
}: ReauthenticationModalProps) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
    },
  });

  // Reset form quando modal abre/fecha
  useEffect(() => {
    if (open) {
      form.reset();
      setShowPassword(false);
    }
  }, [open, form]);

  const handleSubmit = (values: FormValues) => {
    onSubmit(values.password);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onInteractOutside={(e) => {
          // Prevenir fechar clicando fora durante operações de alto risco
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/20">
              <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-xl">Reautenticação Necessária</DialogTitle>
              <DialogDescription className="mt-1">
                Esta ação requer confirmação da sua identidade
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Alert variant="destructive" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
          <AlertTriangle className="h-4 w-4 !text-amber-600 dark:!text-amber-500" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            {alertTitle ?? 'Confirmação de Identidade'}
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            {alertDescription
              ?? (actionDescription
                ? `Você está prestes a executar: ${actionDescription}. Esta ação pode ter impacto significativo no sistema.`
                : 'Esta ação pode ter impacto significativo no sistema e requer reautenticação.')}
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {fieldLabel ?? 'Digite sua senha para continuar'}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Sua senha"
                        autoFocus
                        autoComplete="current-password"
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <span className="text-xs">Ocultar</span>
                        ) : (
                          <span className="text-xs">Mostrar</span>
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro ao reautenticar</AlertTitle>
                <AlertDescription>
                  {error.message || 'Senha incorreta. Tente novamente.'}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Verificando...' : (submitLabel ?? 'Confirmar Identidade')}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100">
          <p className="font-medium">{infoTitle ?? 'ℹ️ Por que preciso reautenticar?'}</p>
          <p className="mt-1 text-xs opacity-90">
            {infoDescription
              ?? 'Operações críticas (exclusões, exportações sensíveis, alterações estruturais) exigem reautenticação para evitar ações acidentais ou não autorizadas. Sua sessão de reautenticação será válida por 5 minutos.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
