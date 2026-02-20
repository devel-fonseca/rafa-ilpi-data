import type { ControlledClass, PrescriptionType } from '@/api/prescriptions.api'

export enum PrescriptionMonitoringStatus {
  ACTIVE = 'ACTIVE',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
}

export interface PrescriptionMonitoringItem {
  id: string
  residentId: string
  residentName: string
  prescriptionType: PrescriptionType
  status: PrescriptionMonitoringStatus
  doctorName: string
  doctorCrm: string
  prescriptionDate: string
  validUntil?: string
  reviewDate?: string
  daysUntilExpiry?: number
  daysUntilReview?: number
  medicationCount: number
  medicationNames: string[]
  isControlled: boolean
  controlledClass?: ControlledClass
  notes?: string
}

export type PrescriptionMonitoringFilter =
  | 'all'
  | 'active'
  | 'expiring'
  | 'expired'
  | 'needs_review'
  | 'controlled'
