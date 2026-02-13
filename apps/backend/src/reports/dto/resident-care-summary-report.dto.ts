// ──────────────────────────────────────────────────────────────────────────────
//  DTO - Resumo Assistencial do Residente
//
//  Relatório completo com todas as informações assistenciais de um residente
// ──────────────────────────────────────────────────────────────────────────────

// ========== DADOS BÁSICOS ==========

export interface ResidentBasicInfoDto {
  id: string
  fullName: string
  birthDate: string // YYYY-MM-DD
  age: number
  cpf: string | null
  cns: string | null
  photoUrl: string | null
  admissionDate: string // YYYY-MM-DD
  bedCode: string | null
}

// ========== RESPONSÁVEL LEGAL ==========

export interface LegalGuardianDto {
  name: string
  phone: string | null
  email: string | null
  relationship: string
  guardianshipType: string | null
}

// ========== CONTATOS DE EMERGÊNCIA ==========

export interface EmergencyContactDto {
  name: string
  phone: string
  relationship: string | null
}

// ========== CONVÊNIOS ==========

export interface HealthInsuranceDto {
  name: string
  planNumber: string | null
}

// ========== TIPO SANGUÍNEO ==========

export interface BloodTypeDto {
  bloodType: string
  rhFactor: string
  formatted: string // Ex: "B+"
}

// ========== MEDIDAS ANTROPOMÉTRICAS ==========

export interface AnthropometryDto {
  height: number | null // metros
  weight: number | null // kg
  bmi: number | null
  recordedAt: string | null // ISO datetime
}

// ========== SINAIS VITAIS ==========

export interface VitalSignsDto {
  systolicPressure: number | null
  diastolicPressure: number | null
  heartRate: number | null
  temperature: number | null
  oxygenSaturation: number | null
  bloodGlucose: number | null
  recordedAt: string | null // ISO datetime
}

// ========== PERFIL CLÍNICO ==========

export interface ClinicalProfileDto {
  healthStatus: string | null
  specialNeeds: string | null
  functionalAspects: string | null
  independenceLevel: string | null
}

// ========== AVALIAÇÃO DE DEPENDÊNCIA ==========

export interface DependencyAssessmentDto {
  level: string // Grau I, II ou III
  description: string
  assessmentDate: string // YYYY-MM-DD
}

// ========== CONDIÇÕES CRÔNICAS ==========

export interface ChronicConditionDto {
  name: string
  details: string | null
}

// ========== ALERGIAS ==========

export interface AllergyDto {
  allergen: string
  severity: string
  reaction: string | null
}

// ========== RESTRIÇÕES ALIMENTARES ==========

export interface DietaryRestrictionDto {
  restriction: string
  type: string
  notes: string | null
}

// ========== IMUNIZAÇÕES ==========

export interface VaccinationDto {
  vaccineName: string
  doseNumber: string | null
  applicationDate: string // YYYY-MM-DD
  manufacturer: string | null
  batchNumber: string | null
  applicationLocation: string | null
}

// ========== MEDICAMENTOS EM USO ==========

export interface MedicationDto {
  name: string
  dosage: string | null
  route: string | null
  frequency: string | null
  schedules: string[] // Array de horários: ["08:00", "20:00"]
}

// ========== PROGRAMAÇÃO DA ROTINA ==========

export interface RoutineScheduleDto {
  recordType: string
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  dayOfWeek: number | null
  dayOfMonth: number | null
  suggestedTimes: string[]
  mealType: string | null
}

// ========== RELATÓRIO COMPLETO ==========

export interface ResidentCareSummaryReportDto {
  generatedAt: string // ISO datetime
  resident: ResidentBasicInfoDto
  legalGuardian: LegalGuardianDto | null
  emergencyContacts: EmergencyContactDto[]
  healthInsurances: HealthInsuranceDto[]
  bloodType: BloodTypeDto | null
  anthropometry: AnthropometryDto | null
  vitalSigns: VitalSignsDto | null
  clinicalProfile: ClinicalProfileDto | null
  dependencyAssessment: DependencyAssessmentDto | null
  chronicConditions: ChronicConditionDto[]
  allergies: AllergyDto[]
  dietaryRestrictions: DietaryRestrictionDto[]
  vaccinations: VaccinationDto[]
  medications: MedicationDto[]
  routineSchedules: RoutineScheduleDto[]
}
