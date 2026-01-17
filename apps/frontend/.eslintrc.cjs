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
    // Regra: Proibir fetch() direto (usar api.ts)
    'no-restricted-globals': [
      'error',
      {
        name: 'fetch',
        message: '❌ Use api.get/post do src/services/api.ts ao invés de fetch() direto! Ver: docs/PLANO-MIGRACAO-FRONTEND-DR-E.md',
      },
    ],
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
      // Multi-Tenant Rule: Proibir axios.create duplicado (usar api.ts)
      {
        selector: "MemberExpression[object.name='axios'][property.name='create']",
        message: '❌ Use a instância "api" de src/services/api.ts ao invés de criar novo axios! Ver: docs/PLANO-MIGRACAO-FRONTEND-DR-E.md',
      },
    ],
  },
  overrides: [
    {
      // Ignorar warnings de cores hardcoded em componentes visuais/design específicos
      files: [
        '**/components/admin/**',
        '**/components/billing/**',
        '**/components/calendar/**',
        '**/components/caregiver/**',
        '**/components/features/**',
        '**/components/rdc/**',
        '**/components/residents/PreRegistrationModal.tsx',
        '**/components/residents/ResidentSelectionGrid.tsx',
        '**/components/superadmin/**',
        '**/components/ui/**',
        '**/pages/superadmin/**',
        '**/components/agenda/**',
      ],
      rules: {
        'no-restricted-syntax': [
          'warn',
          {
            selector: "NewExpression[callee.name='Date'][arguments.length=1][arguments.0.type='Identifier']",
            message: '⚠️ Evite new Date(variável) - Use helpers de dateHelpers.ts ou formMappers.ts. Veja docs/GUIA-PADROES-DATA.md',
          },
          {
            selector: "MemberExpression[object.name='axios'][property.name='create']",
            message: '❌ Use a instância "api" de src/services/api.ts ao invés de criar novo axios! Ver: docs/PLANO-MIGRACAO-FRONTEND-DR-E.md',
          },
          // Cores hardcoded desabilitadas para componentes visuais
        ],
      },
    },
    {
      // Desabilitar react-refresh/only-export-components para arquivos base do design system
      // Esses arquivos exportam componentes + constantes (variants, styles, hooks) por design
      files: [
        '**/components/ui/**/*.tsx',
        '**/components/pdf/**/*.tsx',
        '**/contexts/**/*.tsx',
        '**/pages/daily-records/index.tsx',
      ],
      rules: {
        'react-refresh/only-export-components': 'off',
      },
    },
  ],
}
