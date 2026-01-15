/**
 * ESLint Local Rules - Rafa ILPI Backend
 *
 * Custom rules para validar arquitetura do projeto.
 */

module.exports = {
  rules: {
    'no-tenant-model-via-public-client': require('./no-tenant-model-via-public-client'),
  },
};
