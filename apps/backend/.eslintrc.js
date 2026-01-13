module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],

    // Regras customizadas para prevenir bugs de timezone em campos date-only
    'no-restricted-syntax': [
      'warn',
      {
        // Prevenir: new Date(variável) em contextos de criação/update
        selector: "NewExpression[callee.name='Date'][arguments.length=1][arguments.0.type='Identifier']",
        message: '⚠️ Evite new Date(variável) para campos date-only. Use parseISO(`${date}T12:00:00.000`). Veja docs/GUIA-PADROES-DATA.md',
      },
      {
        // Prevenir: date.setHours() que é frágil para timezone
        selector: "CallExpression[callee.property.name='setHours']",
        message: '⚠️ Evite setHours() - Use startOfDay/endOfDay do date-fns. Veja docs/GUIA-PADROES-DATA.md',
      },
      {
        // Prevenir: Date.now() + aritmética manual
        selector: "BinaryExpression[operator=/^[+\\-]$/][left.callee.object.name='Date'][left.callee.property.name='now']",
        message: '⚠️ Evite Date.now() + aritmética manual - Use addDays/addMonths do date-fns. Veja docs/GUIA-PADROES-DATA.md',
      },
    ],
  },
};
