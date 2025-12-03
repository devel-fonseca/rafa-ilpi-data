import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '@/types/preferences';
import { updateMyPreferences, getMyProfile } from '@/services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingScreen } from '@/components/LoadingScreen';

interface PreferencesContextValue {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => Promise<void>;
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: isAuthenticated, // Só executar se estiver autenticado
    retry: false, // Não tentar novamente em caso de erro
  });

  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);

  // Sincronizar preferências do perfil com o estado local
  useEffect(() => {
    if (profile?.preferences) {
      setPreferences({
        ...DEFAULT_USER_PREFERENCES,
        ...profile.preferences,
      });
    } else {
      setPreferences(DEFAULT_USER_PREFERENCES);
    }
  }, [profile?.preferences]);

  // Aplicar tema ao document root
  useEffect(() => {
    const root = document.documentElement;

    // Se não está autenticado, manter tema claro por padrão
    if (!isAuthenticated) {
      root.classList.remove('dark');
      return;
    }

    if (preferences.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [preferences.theme, isAuthenticated]);

  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setIsLoading(true);

      // Atualização otimista - atualiza UI imediatamente
      const previousPreferences = preferences;
      setPreferences({
        ...previousPreferences,
        [key]: value,
      });

      try {
        // Envia para o backend
        await updateMyPreferences({ [key]: value });

        // Atualiza o cache do perfil com os novos dados (sem refetch)
        queryClient.setQueryData(['my-profile'], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            preferences: {
              ...oldData.preferences,
              [key]: value,
            },
          };
        });
      } catch (error) {
        console.error('Erro ao atualizar preferência:', error);

        // Rollback em caso de erro
        setPreferences(previousPreferences);

        toast.error('Não foi possível salvar sua preferência. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    },
    [preferences, queryClient]
  );

  // Mostrar loading screen enquanto carrega o perfil do usuário autenticado
  if (isAuthenticated && isLoadingProfile) {
    return <LoadingScreen />;
  }

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreference, isLoading }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences deve ser usado dentro de PreferencesProvider');
  }
  return context;
}
