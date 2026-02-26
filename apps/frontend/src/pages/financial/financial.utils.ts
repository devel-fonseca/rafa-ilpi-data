import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  FinancialAccountType,
  FinancialCategoryType,
  FinancialReconciliationStatus,
  FinancialTransactionStatus,
  FinancialTransactionType,
} from '@/types/financial-operations'
import { extractDateOnly, getCurrentDate } from '@/utils/dateHelpers'
import type { AccountFormState } from './components/FinancialAccountDialog'
import type { CategoryFormState } from './components/FinancialCategoryDialog'
import type { PaymentMethodFormState } from './components/FinancialPaymentMethodDialog'
import type { ReconciliationFormState } from './components/FinancialReconciliationDialog'
import type { TransactionFormState } from './components/FinancialTransactionDialog'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function parseCurrencyValue(value: string | number): number {
  if (typeof value === 'number') return value
  const normalized = value
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const asNumber = Number(normalized)
  return Number.isNaN(asNumber) ? 0 : asNumber
}

export function formatCurrency(value: string | number): string {
  return currencyFormatter.format(parseCurrencyValue(value))
}

export function toPtBrDecimalInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const asNumber = parseCurrencyValue(value)
  return decimalFormatter.format(asNumber)
}

export function normalizePtBrDecimalInput(raw: string): string {
  const clean = raw.replace(/[^\d,.-]/g, '')
  const hasNegative = clean.trim().startsWith('-')
  const unsigned = clean.replace(/-/g, '')
  const joinSign = (value: string) => (hasNegative ? `-${value}` : value)

  if (!/\d/.test(unsigned)) {
    return hasNegative ? '-' : ''
  }

  const lastComma = unsigned.lastIndexOf(',')
  const lastDot = unsigned.lastIndexOf('.')
  const separatorIndex = Math.max(lastComma, lastDot)

  if (separatorIndex === -1) {
    return joinSign(unsigned.replace(/\D/g, ''))
  }

  const intPart = unsigned.slice(0, separatorIndex).replace(/\D/g, '')
  const decimalRaw = unsigned.slice(separatorIndex + 1).replace(/\D/g, '')
  const hasTrailingSeparator = separatorIndex === unsigned.length - 1
  const shouldTreatAsDecimal = hasTrailingSeparator || decimalRaw.length <= 2

  if (!shouldTreatAsDecimal) {
    return joinSign(unsigned.replace(/\D/g, ''))
  }

  const decimalPart = decimalRaw.slice(0, 2)
  const normalizedInt = intPart || '0'

  if (decimalPart.length > 0 || hasTrailingSeparator) {
    return joinSign(`${normalizedInt},${decimalPart}`)
  }

  return joinSign(normalizedInt)
}

export function parsePtBrDecimalToNumber(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parsePtBrDecimalToApi(value: string): string {
  return parsePtBrDecimalToNumber(value).toFixed(2)
}

export function formatMonthLabel(competenceMonth: string): string {
  try {
    const date = new Date(`${extractDateOnly(competenceMonth)}T12:00:00`)
    return format(date, "MMM/yy", { locale: ptBR })
      .replace(/^./, (c) => c.toUpperCase())
  } catch {
    return competenceMonth
  }
}

export function formatDateOnly(value: string): string {
  try {
    return format(new Date(`${extractDateOnly(value)}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return value
  }
}

export function toMonthInput(date: string): string {
  return extractDateOnly(date).slice(0, 7)
}

export function fromMonthInput(month: string): string {
  return `${month}-01`
}

export function typeLabel(type: FinancialCategoryType | FinancialTransactionType): string {
  return type === 'INCOME' ? 'Receita' : 'Despesa'
}

export function statusLabel(status: FinancialTransactionStatus): string {
  const labels: Record<FinancialTransactionStatus, string> = {
    PENDING: 'Pendente',
    PAID: 'Pago',
    OVERDUE: 'Vencido',
    CANCELLED: 'Cancelado',
    REFUNDED: 'Estornado',
    PARTIALLY_PAID: 'Parcial',
  }
  return labels[status]
}

export function accountTypeLabel(type: FinancialAccountType): string {
  const labels: Record<FinancialAccountType, string> = {
    CHECKING: 'Corrente',
    SAVINGS: 'Poupança',
    PAYMENT: 'Pagamento',
  }
  return labels[type]
}

export function reconciliationStatusLabel(status: FinancialReconciliationStatus): string {
  const labels: Record<FinancialReconciliationStatus, string> = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em andamento',
    RECONCILED: 'Conciliado',
    DISCREPANCY: 'Com divergência',
  }
  return labels[status]
}

export const emptyCategoryForm: CategoryFormState = {
  name: '',
  description: '',
  type: 'INCOME',
  parentCategoryId: '',
  isActive: true,
}

export const emptyTransactionForm: TransactionFormState = {
  type: 'INCOME',
  categoryId: '',
  amount: '',
  discountAmount: '',
  lateFeeMode: 'amount',
  lateFeeAmount: '',
  lateFeePercentage: '',
  issueDate: getCurrentDate(),
  dueDate: getCurrentDate(),
  competenceMonth: getCurrentDate().slice(0, 7),
  paymentMethodId: '',
  bankAccountId: '',
  description: '',
  notes: '',
}

export const emptyAccountForm: AccountFormState = {
  bankCode: '',
  bankName: '',
  branch: '',
  accountNumber: '',
  accountType: 'CHECKING',
  accountName: '',
  pixKey: '',
  pixKeyType: '',
  isActive: true,
  isDefault: false,
  currentBalance: '0,00',
}

export const emptyPaymentMethodForm: PaymentMethodFormState = {
  name: '',
  code: '',
  description: '',
  allowsInstallments: false,
  maxInstallments: 1,
  isActive: true,
}

export const emptyReconciliationForm: ReconciliationFormState = {
  bankAccountId: '',
  reconciliationDate: getCurrentDate(),
  startDate: getCurrentDate(),
  endDate: getCurrentDate(),
  openingBalance: '0,00',
  closingBalance: '0,00',
  notes: '',
}
