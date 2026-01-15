/**
 * ESLint Custom Rule: no-tenant-model-via-public-client
 *
 * Detecta violações de arquitetura multi-tenant onde serviços tentam
 * acessar TENANT tables via public client (this.prisma.<tenantModel>).
 *
 * ❌ ERRADO:
 * this.prisma.resident.findMany({ where: { tenantId } })
 *
 * ✅ CORRETO:
 * this.tenantContext.client.resident.findMany({ where: { ... } })
 *
 * Exceções permitidas:
 * - Services em src/tenants/ que usam getTenantClient()
 * - Services em src/auth/ com lógica híbrida (SUPERADMIN)
 * - Services em src/permissions/ com UNION ALL queries
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Proíbe acesso a TENANT tables via public client (this.prisma.<tenantModel>)',
      category: 'Architecture',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      tenantModelViaPublicClient:
        '❌ VIOLAÇÃO ARQUITETURA MULTI-TENANT: Tentativa de acessar "{{model}}" (TENANT table) via public client (this.prisma.{{model}}). ' +
        '\n\n✅ CORRETO: Use this.tenantContext.client.{{model}} (REQUEST scope) ou this.prisma.getTenantClient(schemaName).{{model}} (SHARED services).' +
        '\n\n📖 Ver docs/architecture/multi-tenancy.md para padrões corretos.',
    },
  },

  create(context) {
    /**
     * Lista de TENANT models (66 tabelas que ficam em tenant schemas)
     *
     * Baseado no schema Prisma após refatoração para schema isolation.
     * Qualquer acesso a esses models deve ser via tenant client, NÃO via public client.
     */
    const TENANT_MODELS = new Set([
      // Users & Profiles
      'user',
      'userProfile',
      'customPermission',

      // Residents & History
      'resident',
      'residentHistory',
      'residentHistoryChange',
      'residentEmergencyContact',
      'residentDocument',

      // Resident Contracts
      'residentContract',
      'residentContractChange',

      // Infrastructure
      'building',
      'floor',
      'room',
      'bed',
      'bedStatusHistory',

      // Clinical
      'clinicalProfile',
      'clinicalProfileHistory',
      'clinicalProfileHistoryChange',
      'clinicalNote',
      'vitalSign',
      'vitalSignHistory',
      'vitalSignHistoryChange',
      'dailyRecord',

      // Medications
      'medication',
      'prescription',
      'prescriptionMedication',
      'medicationAdministration',

      // Vaccinations
      'vaccination',

      // POPs
      'pop',
      'popVersion',
      'popExecution',

      // Institutional Events
      'institutionalEvent',
      'institutionalEventDocument',

      // Communication
      'notification',
      'message',
      'messageRecipient',

      // Documents
      'document',
      'documentVersion',

      // Auditing
      'auditLog',

      // Tenant Profile
      'tenantProfile',

      // Adicionar outros models conforme schema Prisma
    ]);

    /**
     * Lista de SHARED models (9 tabelas em schema public)
     *
     * Esses models DEVEM ser acessados via this.prisma (public client).
     */
    const SHARED_MODELS = new Set([
      'tenant',
      'plan',
      'subscription',
      'serviceContract',
      'contractAcceptance',
      'emailTemplate',
      'emailTemplateVersion',
      'tenantMessage',
      'webhookEvent',
    ]);

    /**
     * Arquivos/serviços com exceções permitidas
     *
     * Esses arquivos implementam lógica híbrida ou UNION ALL queries
     * e já foram revisados manualmente.
     */
    const ALLOWED_EXCEPTIONS = [
      'src/tenants/tenants.service.ts', // Usa getTenantClient()
      'src/auth/auth.service.ts', // Lógica híbrida SUPERADMIN
      'src/permissions/permissions-cache.service.ts', // UNION ALL queries
    ];

    const filename = context.getFilename();

    // Permitir exceções
    if (ALLOWED_EXCEPTIONS.some((path) => filename.includes(path))) {
      return {}; // Não validar arquivos com exceção
    }

    return {
      /**
       * Detecta padrão: this.prisma.<model>
       *
       * AST Pattern:
       * MemberExpression {
       *   object: MemberExpression {
       *     object: ThisExpression
       *     property: Identifier { name: "prisma" }
       *   }
       *   property: Identifier { name: "<model>" }
       * }
       */
      MemberExpression(node) {
        // Verificar se é this.prisma.<algo>
        if (
          node.object.type === 'MemberExpression' &&
          node.object.object.type === 'ThisExpression' &&
          node.object.property.type === 'Identifier' &&
          node.object.property.name === 'prisma' &&
          node.property.type === 'Identifier'
        ) {
          const modelName = node.property.name;

          // Verificar se é TENANT model
          if (TENANT_MODELS.has(modelName)) {
            context.report({
              node,
              messageId: 'tenantModelViaPublicClient',
              data: {
                model: modelName,
              },
            });
          }

          // Nota: SHARED models via this.prisma são CORRETOS, não reportar
        }
      },
    };
  },
};
