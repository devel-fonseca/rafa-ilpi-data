/**
 * 📏 Design System RAFA ILPI - Tokens de Espaçamento
 *
 * Escala consistente de espaçamento para uso em padding, margin, gap, etc.
 *
 * @author Dr. E. (Emanuel) + Claude Code
 * @date 24 de novembro de 2025
 */

/**
 * Escala de espaçamento
 *
 * Baseada no sistema Tailwind com nomes semânticos
 */
export const SPACING = {
  /** 4px - Espaçamento micro (ícones, bordas internas) */
  xs: '1',
  /** 8px - Espaçamento pequeno (gap entre elementos próximos) */
  sm: '2',
  /** 16px - Espaçamento médio (padding de components) */
  md: '4',
  /** 24px - Espaçamento grande (seções, grupos) */
  lg: '6',
  /** 32px - Espaçamento extra grande (espaçamento entre seções maiores) */
  xl: '8',
  /** 48px - Espaçamento duplo extra grande */
  '2xl': '12',
  /** 64px - Espaçamento triplo extra grande */
  '3xl': '16',
} as const

/**
 * Padrões de espaçamento para componentes comuns
 */
export const COMPONENT_SPACING = {
  /** Padding interno de cards */
  card: {
    padding: 'p-6', // 24px
    gap: 'space-y-4', // 16px entre elementos
  },

  /** Espaçamento de formulários */
  form: {
    fieldGap: 'space-y-4', // 16px entre campos
    sectionGap: 'space-y-8', // 32px entre seções
    labelGap: 'gap-2', // 8px entre label e input
  },

  /** Espaçamento de listas */
  list: {
    itemGap: 'space-y-2', // 8px entre itens
    sectionGap: 'space-y-6', // 24px entre seções
  },

  /** Espaçamento de página */
  page: {
    padding: 'p-6', // 24px de padding geral
    sectionGap: 'space-y-8', // 32px entre seções
    containerMaxWidth: 'max-w-7xl', // Largura máxima de container
  },

  /** Espaçamento de botões */
  button: {
    paddingX: 'px-4', // 16px horizontal
    paddingY: 'py-2', // 8px vertical
    gap: 'gap-2', // 8px entre ícone e texto
  },

  /** Espaçamento de modais */
  modal: {
    padding: 'p-6', // 24px interno
    gap: 'space-y-4', // 16px entre elementos
    footerGap: 'gap-3', // 12px entre botões do footer
  },
} as const

export default SPACING
