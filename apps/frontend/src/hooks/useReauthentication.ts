/**
 * Hook useReauthentication
 *
 * Gerencia reautenticação para operações de alto risco.
 * Armazena token de reautenticação em memória (não em localStorage por segurança).
 *
 * @module useReauthentication
 */

import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  setReauthToken,
  getReauthToken,
  hasValidReauthToken,
  clearReauthToken,
} from '@/lib/reauth-token';

// Re-exportar para compatibilidade com código existente
export { getReauthToken } from '@/lib/reauth-token';

/**
 * Response do endpoint POST /auth/reauthenticate
 */
interface ReauthenticationResponse {
  reauthToken: string;
  expiresIn: number; // segundos
}

/**
 * Hook para gerenciar reautenticação de alto risco
 *
 * **Fluxo completo:**
 * 1. Usuário tenta ação de alto risco (DELETE_RESIDENT, EXPORT_DATA, etc.)
 * 2. Backend retorna 403 com { code: 'REAUTHENTICATION_REQUIRED' }
 * 3. Frontend chama openReauthModal() que abre modal
 * 4. Usuário digita senha
 * 5. reauthenticate(password) valida e obtém token
 * 6. Token armazenado em memória (válido por 5min)
 * 7. Próximas requisições high-risk incluem header X-Reauth-Token
 * 8. Após 5min, token expira e processo reinicia
 *
 * **Exemplo de uso:**
 * ```tsx
 * function DeleteResidentButton({ residentId }) {
 *   const { reauthenticate, hasValidToken, openReauthModal } = useReauthentication();
 *   const deleteResident = useMutation({
 *     mutationFn: () => api.delete(`/residents/${residentId}`),
 *     onError: (error) => {
 *       if (error.response?.data?.code === 'REAUTHENTICATION_REQUIRED') {
 *         openReauthModal(() => deleteResident.mutate());
 *       }
 *     }
 *   });
 *
 *   return <button onClick={() => deleteResident.mutate()}>Excluir</button>;
 * }
 * ```
 *
 * **Interceptor automático:**
 * O axios interceptor detecta 403 com requiresReauth automaticamente
 * e adiciona X-Reauth-Token nos retries se token válido.
 */
export function useReauthentication() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const onSuccessCallback = useRef<(() => void) | null>(null);

  /**
   * Verifica se existe token de reautenticação válido
   */
  const hasValidToken = useCallback((): boolean => {
    return hasValidReauthToken();
  }, []);

  /**
   * Obtém token de reautenticação válido (se existir)
   */
  const getToken = useCallback((): string | null => {
    return getReauthToken();
  }, []);

  /**
   * Limpa token de reautenticação da memória
   */
  const clearToken = useCallback(() => {
    clearReauthToken();
  }, []);

  /**
   * Mutation para reautenticação
   */
  const reauthMutation = useMutation<ReauthenticationResponse, Error, string>({
    mutationFn: async (password: string) => {
      const response = await api.post<ReauthenticationResponse>(
        '/auth/reauthenticate',
        { password }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Armazenar token em memória usando o módulo centralizado
      setReauthToken(data.reauthToken, data.expiresIn);

      // Fechar modal
      setIsModalOpen(false);

      // Executar callback de sucesso (retry da operação original)
      if (onSuccessCallback.current) {
        onSuccessCallback.current();
        onSuccessCallback.current = null;
      }
    },
    onError: () => {
      // Manter modal aberto para usuário tentar novamente
      // Erro será tratado pelo componente do modal
    },
  });

  /**
   * Abre modal de reautenticação
   *
   * @param onSuccess - Callback executado após reautenticação bem-sucedida
   *
   * @example
   * ```typescript
   * // Após receber 403 REAUTHENTICATION_REQUIRED
   * openReauthModal(() => {
   *   // Retry da operação original
   *   deleteResident.mutate();
   * });
   * ```
   */
  const openReauthModal = useCallback((onSuccess?: () => void) => {
    onSuccessCallback.current = onSuccess || null;
    setIsModalOpen(true);
  }, []);

  /**
   * Fecha modal de reautenticação
   */
  const closeReauthModal = useCallback(() => {
    setIsModalOpen(false);
    onSuccessCallback.current = null;
    reauthMutation.reset();
  }, [reauthMutation]);

  /**
   * Executa reautenticação com senha fornecida
   *
   * @param password - Senha do usuário
   */
  const reauthenticate = useCallback(
    (password: string) => {
      reauthMutation.mutate(password);
    },
    [reauthMutation]
  );

  return {
    // Estado do modal
    isModalOpen,
    openReauthModal,
    closeReauthModal,

    // Reautenticação
    reauthenticate,
    isReauthenticating: reauthMutation.isPending,
    reauthError: reauthMutation.error,

    // Token management
    hasValidToken,
    getToken,
    clearToken,
  };
}
