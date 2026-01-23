import { PrismaClient, ShiftTemplateType } from '@prisma/client';

// ──────────────────────────────────────────────────────────────────────────────
//  SEED - ShiftTemplates (Templates de Turnos)
// ──────────────────────────────────────────────────────────────────────────────

// UUIDs fixos (padrão 10000000-0000-4000-8000-00000000000X)
// IMPORTANTE: Estes IDs são IMUTÁVEIS. Nunca altere após deploy em produção!
// FORMATO: RFC 4122 (posição 13 = '4' para versão, posição 17 = '8' para variante)
const FIXED_SHIFT_TEMPLATE_IDS = {
  DAY_8H: '10000000-0000-4000-8000-000000000001',
  AFTERNOON_8H: '10000000-0000-4000-8000-000000000002',
  NIGHT_8H: '10000000-0000-4000-8000-000000000003',
  DAY_12H: '10000000-0000-4000-8000-000000000004',
  NIGHT_12H: '10000000-0000-4000-8000-000000000005',
} as const;

/**
 * Seed de templates de turnos com UUIDs fixos
 *
 * ARQUITETURA:
 * - Templates ficam no public schema (shared reference data)
 * - Tenants customizam via TenantShiftConfig (override pattern)
 * - UUIDs fixos evitam referências órfãs após migrations/resets
 *
 * @see docs/architecture/multi-tenancy.md
 */
export async function seedShiftTemplates(prisma: PrismaClient) {
  console.log('🌱 Seeding ShiftTemplates...');

  const templates = [
    {
      id: FIXED_SHIFT_TEMPLATE_IDS.DAY_8H,
      type: ShiftTemplateType.DAY_8H,
      name: 'Dia 8h',
      startTime: '07:00',
      endTime: '15:00',
      duration: 8,
      description: 'Turno diurno de 8 horas',
      displayOrder: 1,
      isActive: true,
    },
    {
      id: FIXED_SHIFT_TEMPLATE_IDS.AFTERNOON_8H,
      type: ShiftTemplateType.AFTERNOON_8H,
      name: 'Tarde 8h',
      startTime: '15:00',
      endTime: '23:00',
      duration: 8,
      description: 'Turno vespertino de 8 horas',
      displayOrder: 2,
      isActive: true,
    },
    {
      id: FIXED_SHIFT_TEMPLATE_IDS.NIGHT_8H,
      type: ShiftTemplateType.NIGHT_8H,
      name: 'Noite 8h',
      startTime: '23:00',
      endTime: '07:00',
      duration: 8,
      description: 'Turno noturno de 8 horas',
      displayOrder: 3,
      isActive: true,
    },
    {
      id: FIXED_SHIFT_TEMPLATE_IDS.DAY_12H,
      type: ShiftTemplateType.DAY_12H,
      name: 'Dia 12h',
      startTime: '07:00',
      endTime: '19:00',
      duration: 12,
      description: 'Turno diurno de 12 horas',
      displayOrder: 4,
      isActive: true,
    },
    {
      id: FIXED_SHIFT_TEMPLATE_IDS.NIGHT_12H,
      type: ShiftTemplateType.NIGHT_12H,
      name: 'Noite 12h',
      startTime: '19:00',
      endTime: '07:00',
      duration: 12,
      description: 'Turno noturno de 12 horas',
      displayOrder: 5,
      isActive: true,
    },
  ];

  for (const template of templates) {
    await prisma.shiftTemplate.upsert({
      where: { id: template.id },
      create: template,
      update: {
        // Atualiza apenas campos que podem ter mudado
        name: template.name,
        startTime: template.startTime,
        endTime: template.endTime,
        duration: template.duration,
        description: template.description,
        displayOrder: template.displayOrder,
        isActive: template.isActive,
      },
    });
  }

  console.log('✅ ShiftTemplates seeded successfully (5 templates)');
}

// Exportar IDs para uso em validações e migrations
export { FIXED_SHIFT_TEMPLATE_IDS };
