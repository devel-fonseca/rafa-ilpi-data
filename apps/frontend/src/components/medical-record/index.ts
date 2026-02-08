// ──────────────────────────────────────────────────────────────────────────────
//  INDEX - Medical Record Module
// ──────────────────────────────────────────────────────────────────────────────

// Components
export { MedicalRecordSidebar } from './MedicalRecordSidebar'
export { HealthDocumentsTab } from './HealthDocumentsTab'
export { DailyRecordsCalendarModal } from './DailyRecordsCalendarModal'
export { MedicationsCalendarModal } from './MedicationsCalendarModal'

// Modals
export {
  ViewMedicationAdministrationModal,
  EditMedicationAdministrationModal,
  MedicationAdministrationHistoryModal,
  DeleteMedicationAdministrationModal,
} from './modals'

// Views
export {
  ResidentSummaryView,
  ClinicalProfileView,
  VaccinationsView,
  HealthDocumentsView,
  ClinicalNotesView,
  PrescriptionsView,
  MedicationsView,
  DailyRecordsView,
  ScheduleView,
} from './views'

// Types
export type {
  MedicalSection,
  MedicalViewProps,
  ResidentSummaryViewProps,
  DailyRecordsViewProps,
  PrescriptionsViewProps,
  MedicationsViewProps,
  MedicationAdministration,
  ResidentWithAccommodation,
} from './types'
