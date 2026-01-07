/**
 * ESLint Custom Rule: no-hardcoded-colors
 *
 * Bloqueia cores hardcoded do Tailwind CSS (text-red-500, bg-green-100, etc.)
 * e obriga o uso de tokens semânticos do design system.
 *
 * ❌ PROIBIDO:
 * - text-red-500, text-blue-600, text-green-700, etc.
 * - bg-red-100, bg-blue-50, bg-green-200, etc.
 * - border-red-200, border-blue-300, etc.
 *
 * ✅ PERMITIDO:
 * - Tokens semânticos: text-success, bg-danger/10, border-primary/30
 * - Dark mode overrides: dark:text-blue-200, dark:bg-red-900 (contexto específico)
 * - Tokens contextuais: text-bed-available, bg-severity-critical/10
 *
 * @example
 * // ❌ Erro
 * <div className="text-red-500 bg-green-100 border-blue-200">
 *
 * // ✅ Correto
 * <div className="text-danger bg-success/10 border-primary/30">
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Proíbe cores hardcoded do Tailwind - use tokens semânticos do design system',
      category: 'Design System',
      recommended: true,
    },
    messages: {
      useSemanticToken: 'Cor hardcoded "{{color}}" detectada. Use tokens semânticos (text-success, bg-danger/10, border-primary/30) ao invés de cores diretas.',
    },
    fixable: null, // Não auto-fixable (contexto importa)
    schema: [], // Sem opções configuráveis
  },

  create(context) {
    // Regex para detectar cores hardcoded
    // Formato: (text|bg|border)-(red|blue|green|yellow|orange|purple|pink|gray)-[número]
    const hardcodedColorRegex = /\b(text|bg|border)-(red|blue|green|yellow|orange|purple|pink|gray)-[0-9]{1,3}\b/g

    return {
      JSXAttribute(node) {
        // Verifica apenas atributos className
        if (node.name.name !== 'className') {
          return
        }

        // Extrai o valor do className
        let classNameValue = ''

        if (node.value && node.value.type === 'Literal') {
          // className="text-red-500"
          classNameValue = node.value.value
        } else if (node.value && node.value.type === 'JSXExpressionContainer') {
          // className={`text-red-500 ${...}`} ou className={cn(...)}
          // Para simplificar, vamos verificar apenas strings literais
          const expression = node.value.expression

          if (expression.type === 'Literal') {
            classNameValue = expression.value
          } else if (expression.type === 'TemplateLiteral') {
            // Concatena todos os quasis (partes literais do template)
            classNameValue = expression.quasis
              .map(quasi => quasi.value.raw)
              .join(' ')
          }
        }

        // Se não conseguiu extrair valor, pula
        if (!classNameValue || typeof classNameValue !== 'string') {
          return
        }

        // Busca cores hardcoded
        const matches = classNameValue.match(hardcodedColorRegex)

        if (matches && matches.length > 0) {
          // Remove duplicatas
          const uniqueColors = [...new Set(matches)]

          // Verifica se é um dark mode override legítimo
          // Padrão: dark:text-blue-200, dark:bg-red-900
          const isDarkModeOverride = uniqueColors.every(color => {
            const darkModePattern = new RegExp(`dark:${color}`)
            return darkModePattern.test(classNameValue)
          })

          // Se for dark mode override, permite (mas poderia emitir warning)
          if (isDarkModeOverride) {
            // Opcional: emitir warning para revisar se realmente precisa
            // context.report({ node, messageId: 'reviewDarkMode', data: { color: uniqueColors.join(', ') } })
            return
          }

          // Reporta erro
          context.report({
            node,
            messageId: 'useSemanticToken',
            data: {
              color: uniqueColors.join(', '),
            },
          })
        }
      },
    }
  },
}
