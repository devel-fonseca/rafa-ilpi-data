/**
 * ⭕ Design System RAFA ILPI - Tokens de Border Radius
 *
 * Sistema de arredondamento de bordas - padrão "soft rounded"
 *
 * @author Dr. E. (Emanuel) + Claude Code
 * @date 24 de novembro de 2025
 */

/**
 * Escala de border radius
 *
 * RAFA ILPI adota o padrão "soft rounded" (xl = 1rem)
 * Transmite acolhimento e modernidade sem infantilizar
 */
export const RADII = {
  /** Sem arredondamento */
  none: 'rounded-none',

  /** 2px - Arredondamento mínimo */
  xs: 'rounded-xs',

  /** 6px - Arredondamento pequeno */
  sm: 'rounded-sm',

  /** 8px - Arredondamento médio (padrão shadcn) */
  md: 'rounded-md',

  /** 12px - Arredondamento grande */
  lg: 'rounded-lg',

  /** 16px - Arredondamento extra grande (PADRÃO RAFA ILPI) */
  xl: 'rounded-xl',

  /** 24px - Arredondamento duplo extra grande */
  '2xl': 'rounded-2xl',

  /** 32px - Arredondamento triplo extra grande */
  '3xl': 'rounded-3xl',

  /** 100% - Círculo/pílula completa */
  full: 'rounded-full',
} as const

/**
 * Contextos de uso de border radius
 */
export const RADIUS_CONTEXTS = {
  /** Cards, painéis principais */
  card: 'rounded-xl', // 16px - acolhedor

  /** Botões */
  button: 'rounded-md', // 8px - padrão shadcn

  /** Inputs de formulário */
  input: 'rounded-md', // 8px

  /** Badges, tags */
  badge: 'rounded-md', // 8px

  /** Modais e diálogos */
  modal: 'rounded-xl', // 16px - acolhedor

  /** Imagens, avatares circulares */
  avatar: 'rounded-full', // circular

  /** Imagens, thumbnails com bordas */
  image: 'rounded-lg', // 12px

  /** Dropdowns, select popover */
  dropdown: 'rounded-lg', // 12px

  /** Tooltips */
  tooltip: 'rounded-md', // 8px

  /** Notificações toast */
  toast: 'rounded-lg', // 12px

  /** Tabs */
  tab: 'rounded-t-lg', // 12px apenas topo

  /** Separadores de seção */
  section: 'rounded-xl', // 16px - acolhedor
} as const

export default RADII
