module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'eslint-rules'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Regras customizadas para prevenir bugs de timezone
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-restricted-syntax': [
      'warn',
      {
        selector: "NewExpression[callee.name='Date'][arguments.length=1][arguments.0.type='Identifier']",
        message: '⚠️ Evite new Date(variável) - Use helpers de dateHelpers.ts ou formMappers.ts. Veja docs/GUIA-PADROES-DATA.md',
      },
      // Design System Rule: no-hardcoded-colors
      {
        selector: 'JSXAttribute[name.name="className"] Literal[value=/\\b(text|bg|border)-(red|blue|green|yellow|orange|purple|pink|gray)-[0-9]/]',
        message: '🎨 Cor hardcoded detectada. Use tokens semânticos (text-success, bg-danger/10, border-primary/30) ao invés de cores diretas do Tailwind.',
      },
    ],
  },
}
