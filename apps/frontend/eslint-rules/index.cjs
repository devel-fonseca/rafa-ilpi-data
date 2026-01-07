/**
 * ESLint Custom Rules - RAFA ILPI Design System
 *
 * Rules customizadas para garantir consistência com o design system.
 *
 * Uso:
 * 1. Importar no .eslintrc.js
 * 2. Ativar as rules desejadas
 */

module.exports = {
  rules: {
    'no-hardcoded-colors': require('./no-hardcoded-colors.cjs'),
    'no-custom-spacing': require('./no-custom-spacing.cjs'),
  },
}
