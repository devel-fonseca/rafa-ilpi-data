/**
 * ESLint Custom Rule: no-custom-spacing
 *
 * Bloqueia espaçamentos personalizados fora do padrão do design system
 * e obriga o uso apenas dos valores permitidos.
 *
 * ❌ PROIBIDO:
 * - p-3, p-5, p-7, px-3, py-5, etc. (valores não-padrão)
 * - m-3, m-5, m-7, mx-3, my-5, etc.
 * - space-y-3, space-y-5, space-x-3, gap-3, gap-5, etc.
 *
 * ✅ PERMITIDO (conforme COMPONENT_SPACING):
 * - p-0, p-1, p-2, p-4, p-6, p-8, p-12, p-16 (e variantes px, py, pt, pb, pl, pr)
 * - m-0, m-1, m-2, m-4, m-6, m-8, m-12, m-16 (e variantes mx, my, mt, mb, ml, mr)
 * - space-y-0, space-y-1, space-y-2, space-y-4, space-y-6, space-y-8
 * - gap-0, gap-1, gap-2, gap-4, gap-6, gap-8
 *
 * Padrões do Design System RAFA ILPI:
 * - Page container: px-6 py-6
 * - Entre blocos: space-y-6
 * - Dentro de cards: p-6
 * - Linhas de formulário: gap-4
 * - Seções de formulário: space-y-4
 *
 * @example
 * // ❌ Erro
 * <div className="p-3 space-y-5 gap-3">
 *
 * // ✅ Correto
 * <div className="p-6 space-y-6 gap-4">
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Proíbe espaçamentos fora do padrão - use valores do COMPONENT_SPACING',
      category: 'Design System',
      recommended: true,
    },
    messages: {
      useStandardSpacing: 'Espaçamento não-padrão "{{spacing}}" detectado. Use apenas valores permitidos: 0, 1, 2, 4, 6, 8, 12, 16. Padrões: p-6 (cards), space-y-6 (blocos), gap-4 (forms).',
    },
    fixable: null, // Não auto-fixable (contexto importa)
    schema: [], // Sem opções configuráveis
  },

  create(context) {
    // Valores de espaçamento permitidos (conforme COMPONENT_SPACING)
    const ALLOWED_VALUES = ['0', '1', '2', '4', '6', '8', '12', '16']

    // Prefixos de espaçamento
    const SPACING_PREFIXES = [
      // Padding
      'p', 'px', 'py', 'pt', 'pb', 'pl', 'pr',
      // Margin
      'm', 'mx', 'my', 'mt', 'mb', 'ml', 'mr',
      // Space between
      'space-x', 'space-y',
      // Gap
      'gap', 'gap-x', 'gap-y',
    ]

    // Regex para detectar espaçamentos
    // Formato: (p|px|py|m|space-y|gap)-[número]
    const spacingRegex = new RegExp(
      `\\b(${SPACING_PREFIXES.join('|')})-(\\d+)\\b`,
      'g'
    )

    return {
      JSXAttribute(node) {
        // Verifica apenas atributos className
        if (node.name.name !== 'className') {
          return
        }

        // Extrai o valor do className
        let classNameValue = ''

        if (node.value && node.value.type === 'Literal') {
          classNameValue = node.value.value
        } else if (node.value && node.value.type === 'JSXExpressionContainer') {
          const expression = node.value.expression

          if (expression.type === 'Literal') {
            classNameValue = expression.value
          } else if (expression.type === 'TemplateLiteral') {
            classNameValue = expression.quasis
              .map(quasi => quasi.value.raw)
              .join(' ')
          }
        }

        if (!classNameValue || typeof classNameValue !== 'string') {
          return
        }

        // Busca espaçamentos
        const matches = [...classNameValue.matchAll(spacingRegex)]
        const invalidSpacings = []

        matches.forEach(match => {
          const [fullMatch, prefix, value] = match

          // Verifica se o valor está na lista de permitidos
          if (!ALLOWED_VALUES.includes(value)) {
            invalidSpacings.push(fullMatch)
          }
        })

        if (invalidSpacings.length > 0) {
          // Remove duplicatas
          const uniqueSpacings = [...new Set(invalidSpacings)]

          context.report({
            node,
            messageId: 'useStandardSpacing',
            data: {
              spacing: uniqueSpacings.join(', '),
            },
          })
        }
      },
    }
  },
}
