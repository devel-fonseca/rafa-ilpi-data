/**
 * ESLint Plugin Loader for Local Rules
 *
 * Este arquivo carrega o plugin local de regras customizadas.
 * É necessário porque ESLint não carrega automaticamente plugins de pastas locais.
 */

const localRulesPlugin = require('./eslint-rules');

module.exports = {
  plugins: {
    'local-rules': localRulesPlugin,
  },
};
