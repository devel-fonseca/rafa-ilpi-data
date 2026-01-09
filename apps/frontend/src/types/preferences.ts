/**
 * Estrutura tipada para as preferências do usuário armazenadas em JSON
 */
export interface UserPreferences {
  /**
   * Tema da interface do usuário
   * @default 'light'
   */
  theme?: 'light' | 'dark';

  /**
   * Estado do sidebar (colapsado ou expandido)
   * @default false
   */
  sidebarCollapsed?: boolean;

  /**
   * Idioma preferido do usuário
   * @default 'pt-BR'
   */
  locale?: string;

  /**
   * Configurações de notificação
   */
  notifications?: {
    email?: boolean;
    push?: boolean;
    sound?: boolean;
  };

  /**
   * Configurações de visualização de tabelas
   */
  tableSettings?: {
    pageSize?: number;
    density?: 'compact' | 'comfortable' | 'spacious';
  };

  /**
   * Modo de visualização na seleção de residentes
   * @default 'grid'
   */
  residentSelectionViewMode?: 'grid' | 'list';
}

/**
 * Preferências padrão aplicadas quando o usuário não possui preferências definidas
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'light',
  sidebarCollapsed: false,
  locale: 'pt-BR',
  notifications: {
    email: true,
    push: true,
    sound: false,
  },
  tableSettings: {
    pageSize: 10,
    density: 'comfortable',
  },
  residentSelectionViewMode: 'grid',
};
