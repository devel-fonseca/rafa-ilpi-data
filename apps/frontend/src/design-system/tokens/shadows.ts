/**
 * 🌑 Design System RAFA ILPI - Tokens de Sombras
 *
 * Sistema de sombras elegante e sutil para elevação de componentes
 *
 * @author Dr. E. (Emanuel) + Claude Code
 * @date 24 de novembro de 2025
 */

/**
 * Escala de sombras
 *
 * Baseada no sistema shadcn/ui - sombras suaves e quase imperceptíveis
 */
export const SHADOWS = {
  /** Sem sombra */
  none: 'shadow-none',

  /** Sombra extra pequena - elementos inline, badges */
  xs: 'shadow-xs',

  /** Sombra pequena - cards, dropdowns */
  sm: 'shadow-sm',

  /** Sombra média - hover de painéis */
  md: 'shadow-md',

  /** Sombra grande - modais, popovers */
  lg: 'shadow-lg',

  /** Sombra extra grande - elementos muito elevados */
  xl: 'shadow-xl',

  /** Sombra dupla extra grande - overlays principais */
  '2xl': 'shadow-2xl',

  /** Sombra interna - campos de input, áreas pressionadas */
  inner: 'shadow-inner',
} as const

/**
 * Contextos de uso de sombras
 */
export const SHADOW_CONTEXTS = {
  /** Cards padrão */
  card: 'shadow-sm',

  /** Card em hover */
  cardHover: 'shadow-md',

  /** Dropdowns e select popover */
  dropdown: 'shadow-lg',

  /** Modais e diálogos */
  modal: 'shadow-2xl',

  /** Tooltips */
  tooltip: 'shadow-md',

  /** Floating buttons (FABs) */
  fab: 'shadow-lg',

  /** Input focus */
  inputFocus: 'shadow-sm ring-2 ring-primary/20',

  /** Elevação de navegação fixa */
  navigation: 'shadow-sm',
} as const

export default SHADOWS
