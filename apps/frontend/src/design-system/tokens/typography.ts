/**
 * 🔤 Design System RAFA ILPI - Tokens de Tipografia
 *
 * Hierarquia tipográfica consistente para todo o sistema
 *
 * @author Dr. E. (Emanuel) + Claude Code
 * @date 24 de novembro de 2025
 */

/**
 * Família de fontes
 */
export const FONT_FAMILY = {
  /** Fonte principal (Inter) com fallbacks */
  sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'].join(', '),
  /** Fonte monospace para código */
  mono: ['ui-monospace', 'SFMono-Regular', 'Monaco', 'Consolas', 'monospace'].join(', '),
} as const

/**
 * Pesos de fonte
 */
export const FONT_WEIGHT = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

/**
 * Escala tipográfica
 *
 * Classes Tailwind para tamanhos de texto
 */
export const FONT_SIZE = {
  /** 12px - Texto de apoio, legendas */
  xs: 'text-xs',
  /** 14px - Texto secundário, descrições */
  sm: 'text-sm',
  /** 16px - Texto base, corpo */
  base: 'text-base',
  /** 18px - Texto de destaque */
  lg: 'text-lg',
  /** 20px - Subtítulos */
  xl: 'text-xl',
  /** 24px - Títulos de seção */
  '2xl': 'text-2xl',
  /** 30px - Títulos de página */
  '3xl': 'text-3xl',
  /** 36px - Títulos principais */
  '4xl': 'text-4xl',
} as const

/**
 * Estilos pré-definidos para elementos comuns
 */
export const TYPOGRAPHY_STYLES = {
  /** Título de página principal */
  pageTitle: 'text-3xl font-semibold text-foreground',

  /** Título de seção */
  sectionTitle: 'text-xl font-semibold text-foreground',

  /** Título de card/componente */
  cardTitle: 'text-lg font-medium text-foreground',

  /** Subtítulo */
  subtitle: 'text-base font-medium text-muted-foreground',

  /** Corpo de texto */
  body: 'text-base font-normal text-foreground',

  /** Texto secundário/suporte */
  caption: 'text-sm text-muted-foreground',

  /** Texto muito pequeno (metadados, timestamps) */
  tiny: 'text-xs text-muted-foreground',

  /** Label de formulário */
  label: 'text-sm font-medium text-foreground',

  /** Texto de erro */
  error: 'text-sm text-danger',

  /** Texto de sucesso */
  success: 'text-sm text-success',

  /** Texto de código inline */
  code: 'font-mono text-sm bg-muted px-1 py-0.5 rounded',
} as const

/**
 * Line height (altura de linha)
 */
export const LINE_HEIGHT = {
  tight: 'leading-tight', // 1.25
  normal: 'leading-normal', // 1.5
  relaxed: 'leading-relaxed', // 1.625
  loose: 'leading-loose', // 2
} as const

/**
 * Helpers para composição de estilos tipográficos
 */
export function getHeadingStyle(level: 1 | 2 | 3 | 4 | 5 | 6): string {
  const styles = {
    1: 'text-4xl font-bold text-foreground',
    2: 'text-3xl font-semibold text-foreground',
    3: 'text-2xl font-semibold text-foreground',
    4: 'text-xl font-semibold text-foreground',
    5: 'text-lg font-medium text-foreground',
    6: 'text-base font-medium text-foreground',
  }
  return styles[level]
}

export default {
  FONT_FAMILY,
  FONT_WEIGHT,
  FONT_SIZE,
  TYPOGRAPHY_STYLES,
  LINE_HEIGHT,
  getHeadingStyle,
}
