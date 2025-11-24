/**
 * Schemas Zod Compartilhados
 * Validações reutilizáveis para o sistema
 */

import { z } from 'zod';

/* -------------------------------------------------------------------------
   UTILS – Validações comuns (BR)
-------------------------------------------------------------------------- */
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const cepRegex = /^\d{5}-?\d{3}$/;
const phoneRegex = /^\(\d{2}\)\s?(9\d{4}|9\d{5})-\d{4}$/;
const ufRegex = /^[A-Z]{2}$/;

const validateCPF = (val: string) => cpfRegex.test(val);
const validateCNPJ = (val: string) => cnpjRegex.test(val);
const validateCEP = (val: string) => cepRegex.test(val);
const validatePhone = (val: string) => phoneRegex.test(val);
const validateUF = (val: string) => ufRegex.test(val);

/* -------------------------------------------------------------------------
   ENUMS – Prisma → Zod
-------------------------------------------------------------------------- */
export const PlanTypeSchema = z.enum(['FREE', 'BASICO', 'PROFISSIONAL', 'ENTERPRISE']);
export const TenantStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED', 'TRIAL']);
export const GenderSchema = z.enum(['MASCULINO', 'FEMININO', 'OUTRO', 'NAO_INFORMADO']);
export const CivilStatusSchema = z.enum([
  'SOLTEIRO',
  'CASADO',
  'DIVORCIADO',
  'VIUVO',
  'UNIAO_ESTAVEL',
]);
export const BloodTypeSchema = z.enum([
  'A_POSITIVO',
  'A_NEGATIVO',
  'B_POSITIVO',
  'B_NEGATIVO',
  'AB_POSITIVO',
  'AB_NEGATIVO',
  'O_POSITIVO',
  'O_NEGATIVO',
  'NAO_INFORMADO',
]);

/* -------------------------------------------------------------------------
   PLAN
-------------------------------------------------------------------------- */
export const PlanCreateSchema = z.object({
  name: z.string().min(1).max(100),
  type: PlanTypeSchema,
  maxResidents: z.number().int().min(1),
  maxUsers: z.number().int().min(1),
  priceMonthly: z.number().min(0),
  features: z.array(z.string()).default([]),
});

export const PlanUpdateSchema = PlanCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type PlanCreateInput = z.infer<typeof PlanCreateSchema>;
export type PlanUpdateInput = z.infer<typeof PlanUpdateSchema>;

/* -------------------------------------------------------------------------
   TENANT
-------------------------------------------------------------------------- */
export const TenantCreateSchema = z.object({
  name: z.string().min(1).max(150),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(3)
    .max(50),
  cnpj: z
    .string()
    .regex(cnpjRegex)
    .refine(validateCNPJ, { message: 'CNPJ inválido' })
    .optional()
    .or(z.literal('').transform(() => undefined)),
  email: z.string().email(),
  phone: z
    .string()
    .refine(validatePhone, { message: 'Telefone inválido' })
    .optional()
    .or(z.literal('').transform(() => undefined)),
  schemaName: z
    .string()
    .regex(/^[a-z_]+$/)
    .min(3)
    .max(50),

  // Endereço detalhado
  addressCity: z.string().max(100).optional(),
  addressDistrict: z.string().max(100).optional(),
  addressNumber: z.string().max(20).optional(),
  addressComplement: z.string().max(100).optional(),
  addressState: z
    .string()
    .refine(validateUF, { message: 'UF inválida' })
    .optional(),
  addressZipCode: z
    .string()
    .refine(validateCEP, { message: 'CEP inválido' })
    .optional(),
});

export const TenantUpdateSchema = TenantCreateSchema.partial().extend({
  id: z.string().uuid(),
  status: TenantStatusSchema.optional(),
  deletedAt: z.coerce.date().optional().nullable(),
});

export type TenantCreateInput = z.infer<typeof TenantCreateSchema>;
export type TenantUpdateInput = z.infer<typeof TenantUpdateSchema>;

/* -------------------------------------------------------------------------
   SUBSCRIPTION (Stripe-style)
-------------------------------------------------------------------------- */
const SubscriptionStatusSchema = z.enum([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
]);

export const SubscriptionCreateSchema = z.object({
  tenantId: z.string().uuid(),
  planId: z.string().uuid(),
  status: SubscriptionStatusSchema,
  currentPeriodStart: z.coerce.date().optional(),
  currentPeriodEnd: z.coerce.date().optional(),
  trialEndDate: z.coerce.date().optional().nullable(),
});

export const SubscriptionUpdateSchema = SubscriptionCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type SubscriptionCreateInput = z.infer<typeof SubscriptionCreateSchema>;
export type SubscriptionUpdateInput = z.infer<typeof SubscriptionUpdateSchema>;

/* -------------------------------------------------------------------------
   USER
-------------------------------------------------------------------------- */
const UserRoleSchema = z.enum(['admin', 'user', 'viewer']);

export const UserCreateSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: UserRoleSchema,
  isActive: z.boolean().optional(),
});

export const UserUpdateSchema = UserCreateSchema.partial().extend({
  id: z.string().uuid(),
  lastLogin: z.coerce.date().optional().nullable(),
  passwordResetRequired: z.boolean().optional(),
  deletedAt: z.coerce.date().optional().nullable(),
});

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  tenantSlug: z.string().optional(),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;
export type UserLoginInput = z.infer<typeof UserLoginSchema>;

/* -------------------------------------------------------------------------
   RESIDENT – MODELO FINAL
-------------------------------------------------------------------------- */

// JSONB: Contatos de Emergência
const EmergencyContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().refine(validatePhone, { message: 'Telefone inválido' }),
  relationship: z.string().min(1),
});

// JSONB: Convênios
const HealthPlanSchema = z.object({
  name: z.string().min(1),
  cardNumber: z.string().optional(),
  cardUrl: z.string().url().optional(),
});

// JSONB: Laudo Médico
const MedicalReportSchema = z.object({
  url: z.string().url(),
  date: z.coerce.date(),
});

// JSONB: Documentos (array de URLs)
const UrlArraySchema = z.array(z.string().url()).default([]);

// Responsável Legal – tipo
const LegalGuardianTypeSchema = z.enum([
  'curador',
  'procurador',
  'responsável convencional',
]);

// Endereço (reutilizável)
const AddressSchema = z.object({
  cep: z.string().refine(validateCEP).optional(),
  state: z.string().refine(validateUF).optional(),
  city: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  phone: z.string().refine(validatePhone).optional(),
});

export const ResidentCreateSchema = z.object({
  tenantId: z.string().uuid(),

  // 0. Status
  status: z.enum(['Ativo', 'Inativo', 'Falecido']).default('Ativo'),

  // 1. Dados Pessoais
  fullName: z.string().min(1).max(150),
  socialName: z.string().max(150).optional(),
  cpf: z.string().refine(validateCPF, { message: 'CPF inválido' }),
  rg: z.string().max(20).optional(),
  rgIssuer: z.string().max(50).optional(),
  education: z.string().max(100).optional(),
  profession: z.string().max(100).optional(),
  cns: z
    .string()
    .regex(/^\d{3} \d{4} \d{4} \d{4}$/)
    .optional(),
  gender: GenderSchema,
  civilStatus: CivilStatusSchema.optional(),
  religion: z.string().max(100).optional(),
  birthDate: z.coerce.date().refine(
    (d) => d < new Date() && d.getFullYear() > 1900,
    { message: 'Data de nascimento inválida' }
  ),
  nationality: z.string().default('Brasileira'),
  birthCity: z.string().max(100).optional(),
  birthState: z.string().refine(validateUF).optional(),
  motherName: z.string().max(150).optional(),
  fatherName: z.string().max(150).optional(),
  documents: UrlArraySchema,

  // 2. Endereços
  currentCep: z.string().refine(validateCEP).optional(),
  currentState: z.string().refine(validateUF).optional(),
  currentCity: z.string().optional(),
  currentStreet: z.string().optional(),
  currentNumber: z.string().optional(),
  currentComplement: z.string().optional(),
  currentDistrict: z.string().optional(),
  currentPhone: z.string().refine(validatePhone).optional(),

  originCep: z.string().refine(validateCEP).optional(),
  originState: z.string().refine(validateUF).optional(),
  originCity: z.string().optional(),
  originStreet: z.string().optional(),
  originNumber: z.string().optional(),
  originComplement: z.string().optional(),
  originDistrict: z.string().optional(),
  originPhone: z.string().refine(validatePhone).optional(),

  addressDocuments: UrlArraySchema,

  // 3. Contatos de Emergência
  emergencyContacts: z.array(EmergencyContactSchema).default([]),

  // 4. Responsável Legal
  legalGuardianName: z.string().optional(),
  legalGuardianCpf: z.string().refine(validateCPF).optional(),
  legalGuardianRg: z.string().optional(),
  legalGuardianPhone: z.string().refine(validatePhone).optional(),
  legalGuardianType: LegalGuardianTypeSchema.optional(),
  legalGuardianCep: z.string().refine(validateCEP).optional(),
  legalGuardianState: z.string().refine(validateUF).optional(),
  legalGuardianCity: z.string().optional(),
  legalGuardianStreet: z.string().optional(),
  legalGuardianNumber: z.string().optional(),
  legalGuardianComplement: z.string().optional(),
  legalGuardianDistrict: z.string().optional(),
  legalGuardianDocuments: UrlArraySchema,

  // 5. Admissão
  admissionDate: z.coerce.date(),
  admissionType: z
    .enum(['temporária', 'longa permanência', 'emergência', 'outro'])
    .optional(),
  admissionReason: z.string().optional(),
  admissionConditions: z.string().optional(),
  dischargeDate: z.coerce.date().optional().nullable(),
  dischargeReason: z.string().optional(),

  // 6. Saúde
  healthStatus: z.string().optional(),
  bloodType: BloodTypeSchema.default('NAO_INFORMADO'),
  height: z.coerce.number().min(0.5).max(2.5).optional(), // metros
  weight: z.coerce.number().min(20).max(300).optional(), // kg
  dependencyLevel: z
    .enum([
      'Grau I - Independente',
      'Grau II - Parcialmente Dependente',
      'Grau III - Totalmente Dependente',
    ])
    .optional(),
  mobilityAid: z.boolean().optional(),
  specialNeeds: z.string().optional(),
  functionalAspects: z.string().optional(),
  medicationsOnAdmission: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  medicalReport: z.array(MedicalReportSchema).default([]),

  // 7. Convênios
  healthPlans: z.array(HealthPlanSchema).default([]),

  // 8. Pertences
  belongings: z.array(z.string()).default([]),

  // 9. Acomodação
  roomId: z.string().max(50).optional(),
  bedId: z.string().max(50).optional(),
});

export const ResidentUpdateSchema = ResidentCreateSchema.partial().extend({
  id: z.string().uuid(),
  deletedAt: z.coerce.date().optional().nullable(),
});

export type ResidentCreateInput = z.infer<typeof ResidentCreateSchema>;
export type ResidentUpdateInput = z.infer<typeof ResidentUpdateSchema>;

/* -------------------------------------------------------------------------
   EXPORT FINAL
-------------------------------------------------------------------------- */
export const Schemas = {
  Plan: { create: PlanCreateSchema, update: PlanUpdateSchema },
  Tenant: { create: TenantCreateSchema, update: TenantUpdateSchema },
  Subscription: { create: SubscriptionCreateSchema, update: SubscriptionUpdateSchema },
  User: { create: UserCreateSchema, update: UserUpdateSchema, login: UserLoginSchema },
  Resident: { create: ResidentCreateSchema, update: ResidentUpdateSchema },
};
