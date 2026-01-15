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
  ignorePatterns: [
    '.eslintrc.js',
    'eslint-rules/**/*.js',
    '**/*.spec.ts',
    '**/*.e2e-spec.ts',
    'test/**/*',
    'dist/**/*',
  ],
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
        message: '⚠️ Evite new Date(variável) para campos date-only. Use parseISO(`${date}T12:00:00.000`). Veja docs/standards/DATETIME_STANDARD.md',
      },
      {
        // Prevenir: date.setHours() que é frágil para timezone
        selector: "CallExpression[callee.property.name='setHours']",
        message: '⚠️ Evite setHours() - Use startOfDay/endOfDay do date-fns. Veja docs/standards/DATETIME_STANDARD.md',
      },
      {
        // Prevenir: Date.now() + aritmética manual
        selector: "BinaryExpression[operator=/^[+\\-]$/][left.callee.object.name='Date'][left.callee.property.name='now']",
        message: '⚠️ Evite Date.now() + aritmética manual - Use addDays/addMonths do date-fns. Veja docs/standards/DATETIME_STANDARD.md',
      },

      // ✅ Regras de Arquitetura Multi-Tenant (Schema Isolation)
      // Previne acesso a TENANT tables via public client (this.prisma.<model>)
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='user']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.user é proibido (User é TENANT table). Use this.tenantContext.client.user ou this.prisma.getTenantClient(schemaName).user. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='resident']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.resident é proibido (Resident é TENANT table). Use this.tenantContext.client.resident. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='bed']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.bed é proibido (Bed é TENANT table). Use this.tenantContext.client.bed. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='room']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.room é proibido (Room é TENANT table). Use this.tenantContext.client.room. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='building']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.building é proibido (Building é TENANT table). Use this.tenantContext.client.building. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='floor']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.floor é proibido (Floor é TENANT table). Use this.tenantContext.client.floor. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='medication']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.medication é proibido (Medication é TENANT table). Use this.tenantContext.client.medication. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='clinicalProfile']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.clinicalProfile é proibido (ClinicalProfile é TENANT table). Use this.tenantContext.client.clinicalProfile. Ver docs/architecture/multi-tenancy.md',
      },
      // ✅ Models adicionais (27 restantes dos 35 TENANT models)
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='userProfile']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.userProfile é proibido (UserProfile é TENANT table). Use this.tenantContext.client.userProfile. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='customPermission']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.customPermission é proibido (CustomPermission é TENANT table). Use this.tenantContext.client.customPermission. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='residentHistory']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.residentHistory é proibido (ResidentHistory é TENANT table). Use this.tenantContext.client.residentHistory. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='residentEmergencyContact']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.residentEmergencyContact é proibido (ResidentEmergencyContact é TENANT table). Use this.tenantContext.client.residentEmergencyContact. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='residentDocument']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.residentDocument é proibido (ResidentDocument é TENANT table). Use this.tenantContext.client.residentDocument. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='residentContract']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.residentContract é proibido (ResidentContract é TENANT table). Use this.tenantContext.client.residentContract. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='bedStatusHistory']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.bedStatusHistory é proibido (BedStatusHistory é TENANT table). Use this.tenantContext.client.bedStatusHistory. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='clinicalProfileHistory']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.clinicalProfileHistory é proibido (ClinicalProfileHistory é TENANT table). Use this.tenantContext.client.clinicalProfileHistory. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='clinicalNote']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.clinicalNote é proibido (ClinicalNote é TENANT table). Use this.tenantContext.client.clinicalNote. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='vitalSign']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.vitalSign é proibido (VitalSign é TENANT table). Use this.tenantContext.client.vitalSign. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='vitalSignHistory']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.vitalSignHistory é proibido (VitalSignHistory é TENANT table). Use this.tenantContext.client.vitalSignHistory. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='dailyRecord']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.dailyRecord é proibido (DailyRecord é TENANT table). Use this.tenantContext.client.dailyRecord. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='prescription']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.prescription é proibido (Prescription é TENANT table). Use this.tenantContext.client.prescription. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='prescriptionMedication']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.prescriptionMedication é proibido (PrescriptionMedication é TENANT table). Use this.tenantContext.client.prescriptionMedication. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='medicationAdministration']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.medicationAdministration é proibido (MedicationAdministration é TENANT table). Use this.tenantContext.client.medicationAdministration. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='vaccination']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.vaccination é proibido (Vaccination é TENANT table). Use this.tenantContext.client.vaccination. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='pop']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.pop é proibido (Pop é TENANT table). Use this.tenantContext.client.pop. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='popVersion']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.popVersion é proibido (PopVersion é TENANT table). Use this.tenantContext.client.popVersion. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='popExecution']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.popExecution é proibido (PopExecution é TENANT table). Use this.tenantContext.client.popExecution. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='institutionalEvent']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.institutionalEvent é proibido (InstitutionalEvent é TENANT table). Use this.tenantContext.client.institutionalEvent. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='institutionalEventDocument']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.institutionalEventDocument é proibido (InstitutionalEventDocument é TENANT table). Use this.tenantContext.client.institutionalEventDocument. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='notification']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.notification é proibido (Notification é TENANT table). Use this.tenantContext.client.notification. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='message']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.message é proibido (Message é TENANT table). Use this.tenantContext.client.message. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='messageRecipient']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.messageRecipient é proibido (MessageRecipient é TENANT table). Use this.tenantContext.client.messageRecipient. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='document']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.document é proibido (Document é TENANT table). Use this.tenantContext.client.document. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='documentVersion']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.documentVersion é proibido (DocumentVersion é TENANT table). Use this.tenantContext.client.documentVersion. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='auditLog']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.auditLog é proibido (AuditLog é TENANT table). Use this.tenantContext.client.auditLog. Ver docs/architecture/multi-tenancy.md',
      },
      {
        selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='tenantProfile']",
        message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.tenantProfile é proibido (TenantProfile é TENANT table). Use this.tenantContext.client.tenantProfile. Ver docs/architecture/multi-tenancy.md',
      },
    ],
  },
};
