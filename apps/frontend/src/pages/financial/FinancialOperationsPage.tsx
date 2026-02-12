import { useEffect, useMemo, useState } from 'react'
import { CircleHelp, CreditCard, Landmark, Plus, Scale, Tags, Wallet, X } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'
import { Page, PageHeader } from '@/design-system/components'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { useAuthStore } from '@/stores/auth.store'
import {
  useCancelFinancialTransaction,
  useCreateFinancialAccount,
  useCreateFinancialPaymentMethod,
  useCreateFinancialReconciliation,
  useCreateFinancialCategory,
  useCreateFinancialTransaction,
  useDeleteFinancialCategory,
  useFinancialAccountStatement,
  useFinancialAccounts,
  useFinancialBankAccounts,
  useFinancialCategories,
  useFinancialPaymentMethodsCatalog,
  useFinancialPaymentMethods,
  useFinancialTransactions,
  useFinancialReconciliation,
  useFinancialReconciliations,
  useFinancialUnreconciledPaidTransactions,
  useMarkFinancialTransactionPaid,
  useUpdateFinancialAccount,
  useUpdateFinancialPaymentMethod,
  useUpdateFinancialCategory,
  useUpdateFinancialTransaction,
} from '@/hooks/useFinancialOperations'
import type {
  CreateFinancialAccountDto,
  CreateFinancialPaymentMethodDto,
  CreateFinancialReconciliationDto,
  CreateCategoryDto,
  CreateTransactionDto,
  FinancialAccountType,
  FinancialBankAccount,
  FinancialCategory,
  FinancialCategoryType,
  FinancialReconciliationStatus,
  FinancialPaymentMethod,
  FinancialTransaction,
  FinancialTransactionStatus,
  FinancialTransactionType,
  UpdateCategoryDto,
} from '@/types/financial-operations'
import { extractDateOnly, getCurrentDate } from '@/utils/dateHelpers'
import { AccountsSection } from './components/AccountsSection'
import { FinancialAccountDialog, type AccountFormState } from './components/FinancialAccountDialog'
import { FinancialAccountStatementDialog } from './components/FinancialAccountStatementDialog'
import { CategoriesSection } from './components/CategoriesSection'
import { FinancialCategoryDialog, type CategoryFormState } from './components/FinancialCategoryDialog'
import { FinancialPaymentMethodDialog, type PaymentMethodFormState } from './components/FinancialPaymentMethodDialog'
import { FinancialReconciliationDialog, type ReconciliationFormState } from './components/FinancialReconciliationDialog'
import { FinancialTransactionDialog, type TransactionFormState } from './components/FinancialTransactionDialog'
import { MarkTransactionPaidDialog } from './components/MarkTransactionPaidDialog'
import { PaymentMethodsSection } from './components/PaymentMethodsSection'
import { ReconciliationDetailsDialog } from './components/ReconciliationDetailsDialog'
import { ReconciliationsSection } from './components/ReconciliationsSection'
import { UnreconciledPaidTransactionsSection } from './components/UnreconciledPaidTransactionsSection'
import { TransactionsSection } from './components/TransactionsSection'
import {
  accountTypeLabel,
  emptyAccountForm,
  emptyCategoryForm,
  emptyPaymentMethodForm,
  emptyReconciliationForm,
  emptyTransactionForm,
  formatCurrency,
  formatDateOnly,
  fromMonthInput,
  reconciliationStatusLabel,
  parsePtBrDecimalToApi,
  parsePtBrDecimalToNumber,
  statusLabel,
  toPtBrDecimalInput,
  toMonthInput,
  typeLabel,
} from './financial.utils'

export default function FinancialOperationsPage() {
  const [searchParams] = useSearchParams()
  const user = useAuthStore((state) => state.user)
  const { hasPermission } = usePermissions()
  const canManageCategories = hasPermission(PermissionType.MANAGE_FINANCIAL_CATEGORIES)
  const canManageTransactions = hasPermission(PermissionType.MANAGE_FINANCIAL_TRANSACTIONS)
  const canManageAccounts = hasPermission(PermissionType.MANAGE_FINANCIAL_ACCOUNTS)
  const canManageReconciliation = hasPermission(PermissionType.MANAGE_FINANCIAL_RECONCILIATION)

  const [tab, setTab] = useState<'transactions' | 'categories' | 'accounts' | 'payment-methods' | 'reconciliations'>('transactions')
  const [showUsageGuide, setShowUsageGuide] = useState(true)

  const [categoryFilterType, setCategoryFilterType] = useState<'' | FinancialCategoryType>('')
  const [categorySearch, setCategorySearch] = useState('')
  const [showInactiveCategories, setShowInactiveCategories] = useState(false)
  const [accountTypeFilter, setAccountTypeFilter] = useState<'' | FinancialAccountType>('')
  const [accountSearch, setAccountSearch] = useState('')
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false)
  const [paymentMethodSearch, setPaymentMethodSearch] = useState('')
  const [showInactivePaymentMethods, setShowInactivePaymentMethods] = useState(false)
  const [reconciliationStatusFilter, setReconciliationStatusFilter] = useState<'' | FinancialReconciliationStatus>('')
  const [reconciliationBankAccountFilter, setReconciliationBankAccountFilter] = useState('')
  const [reconciliationPage, setReconciliationPage] = useState(1)
  const [reconciliationLimit] = useState(20)
  const [unreconciledBankAccountFilter, setUnreconciledBankAccountFilter] = useState('')
  const [unreconciledSearch, setUnreconciledSearch] = useState('')
  const [unreconciledFromDate, setUnreconciledFromDate] = useState(`${getCurrentDate().slice(0, 7)}-01`)
  const [unreconciledToDate, setUnreconciledToDate] = useState(getCurrentDate())

  const [transactionType, setTransactionType] = useState<'' | FinancialTransactionType>('')
  const [transactionStatus, setTransactionStatus] = useState<'' | FinancialTransactionStatus>('')
  const [transactionCategoryId, setTransactionCategoryId] = useState('')
  const [sortField, setSortField] = useState<'dueDate' | 'netAmount' | 'status' | 'description'>('dueDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [transactionSearch, setTransactionSearch] = useState('')
  const [transactionResidentContractId, setTransactionResidentContractId] = useState('')
  const [dueDateFrom, setDueDateFrom] = useState('')
  const [dueDateTo, setDueDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false)
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isAccountStatementOpen, setIsAccountStatementOpen] = useState(false)
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] = useState(false)
  const [isReconciliationDialogOpen, setIsReconciliationDialogOpen] = useState(false)
  const [isReconciliationDetailsOpen, setIsReconciliationDetailsOpen] = useState(false)
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false)
  const [isBatchCancelDialogOpen, setIsBatchCancelDialogOpen] = useState(false)

  const [markPaidDate, setMarkPaidDate] = useState(getCurrentDate())
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([])
  const [transactionToMarkPaid, setTransactionToMarkPaid] = useState<FinancialTransaction | null>(null)
  const [transactionToCancel, setTransactionToCancel] = useState<FinancialTransaction | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<FinancialCategory | null>(null)
  const [categoryToToggle, setCategoryToToggle] = useState<FinancialCategory | null>(null)
  const [accountToToggle, setAccountToToggle] = useState<FinancialBankAccount | null>(null)
  const [accountForStatement, setAccountForStatement] = useState<FinancialBankAccount | null>(null)
  const [paymentMethodToToggle, setPaymentMethodToToggle] = useState<FinancialPaymentMethod | null>(null)
  const [selectedReconciliationId, setSelectedReconciliationId] = useState<string | null>(null)
  const [statementFromDateInput, setStatementFromDateInput] = useState('')
  const [statementToDateInput, setStatementToDateInput] = useState('')
  const [statementFromDate, setStatementFromDate] = useState('')
  const [statementToDate, setStatementToDate] = useState('')

  const [accountForm, setAccountForm] = useState<AccountFormState>(emptyAccountForm)
  const [paymentMethodForm, setPaymentMethodForm] = useState<PaymentMethodFormState>(emptyPaymentMethodForm)
  const [reconciliationForm, setReconciliationForm] = useState<ReconciliationFormState>(emptyReconciliationForm)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm)
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>(emptyTransactionForm)

  const guidePreferenceKey = user?.id ? `financial-operations-guide:${user.id}` : null

  const categoriesQuery = useFinancialCategories({
    type: categoryFilterType || undefined,
    search: categorySearch || undefined,
    activeOnly: !showInactiveCategories,
  })

  const transactionsQuery = useFinancialTransactions({
    type: transactionType || undefined,
    status: transactionStatus || undefined,
    categoryId: transactionCategoryId || undefined,
    residentContractId: transactionResidentContractId || undefined,
    search: transactionSearch || undefined,
    dueDateFrom: dueDateFrom || undefined,
    dueDateTo: dueDateTo || undefined,
    sortField,
    sortDirection,
    page,
    limit,
  })
  const accountsQuery = useFinancialAccounts({
    accountType: accountTypeFilter || undefined,
    search: accountSearch || undefined,
    activeOnly: !showInactiveAccounts,
  })
  const paymentMethodsCatalogQuery = useFinancialPaymentMethodsCatalog({
    search: paymentMethodSearch || undefined,
    activeOnly: !showInactivePaymentMethods,
  })
  const reconciliationsQuery = useFinancialReconciliations({
    status: reconciliationStatusFilter || undefined,
    bankAccountId: reconciliationBankAccountFilter || undefined,
    page: reconciliationPage,
    limit: reconciliationLimit,
  })
  const reconciliationDetailsQuery = useFinancialReconciliation(selectedReconciliationId || undefined)
  const unreconciledPaidTransactionsQuery = useFinancialUnreconciledPaidTransactions({
    bankAccountId: unreconciledBankAccountFilter || undefined,
    fromDate: unreconciledFromDate || undefined,
    toDate: unreconciledToDate || undefined,
    search: unreconciledSearch || undefined,
    page: 1,
    limit: 50,
  })
  const accountStatementQuery = useFinancialAccountStatement(
    isAccountStatementOpen ? accountForStatement?.id : undefined,
    {
      fromDate: statementFromDate || undefined,
      toDate: statementToDate || undefined,
    },
  )
  const reconciliationSystemSummaryQuery = useFinancialAccountStatement(
    isReconciliationDialogOpen ? reconciliationForm.bankAccountId : undefined,
    {
      fromDate: reconciliationForm.startDate || undefined,
      toDate: reconciliationForm.endDate || undefined,
    },
  )
  const paymentMethodsQuery = useFinancialPaymentMethods(true)
  const bankAccountsQuery = useFinancialBankAccounts(true)

  const createAccount = useCreateFinancialAccount()
  const createPaymentMethod = useCreateFinancialPaymentMethod()
  const createReconciliation = useCreateFinancialReconciliation()
  const updateAccount = useUpdateFinancialAccount()
  const updatePaymentMethod = useUpdateFinancialPaymentMethod()
  const createCategory = useCreateFinancialCategory()
  const updateCategory = useUpdateFinancialCategory()
  const deleteCategory = useDeleteFinancialCategory()

  const createTransaction = useCreateFinancialTransaction()
  const updateTransaction = useUpdateFinancialTransaction()
  const markPaid = useMarkFinancialTransactionPaid()
  const cancelTransaction = useCancelFinancialTransaction()

  const categories = categoriesQuery.data || []
  const accounts = accountsQuery.data || []
  const paymentMethodsCatalog = paymentMethodsCatalogQuery.data || []
  const reconciliations = reconciliationsQuery.data?.items || []
  const unreconciledPaidTransactions = unreconciledPaidTransactionsQuery.data?.items || []
  const reconciliationPagination = reconciliationsQuery.data?.pagination
  const transactions = transactionsQuery.data?.items || []
  const transactionPaymentMethods = paymentMethodsQuery.data || []
  const bankAccounts = bankAccountsQuery.data || []
  const pagination = transactionsQuery.data?.pagination

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )

  const compatibleCategories = useMemo(
    () => categories.filter((category) => category.type === transactionForm.type && (category.isActive || category.id === transactionForm.categoryId)),
    [categories, transactionForm.type, transactionForm.categoryId],
  )

  const activeCategoryStats = useMemo(() => {
    const income = categories.filter((category) => category.type === 'INCOME' && category.isActive).length
    const expense = categories.filter((category) => category.type === 'EXPENSE' && category.isActive).length
    return { income, expense }
  }, [categories])

  const transactionSummary = useMemo(() => {
    const income = transactions
      .filter((transaction) => transaction.type === 'INCOME' && transaction.status !== 'CANCELLED')
      .reduce((sum, transaction) => sum + Number(transaction.netAmount || 0), 0)

    const expense = transactions
      .filter((transaction) => transaction.type === 'EXPENSE' && transaction.status !== 'CANCELLED')
      .reduce((sum, transaction) => sum + Number(transaction.netAmount || 0), 0)

    return {
      income,
      expense,
      balance: income - expense,
    }
  }, [transactions])

  const reconciliationSummary = useMemo(() => {
    const reconciledCount = reconciliations.filter((item) => item.status === 'RECONCILED').length
    const discrepancyCount = reconciliations.filter((item) => item.status === 'DISCREPANCY').length
    const totalDifference = reconciliations.reduce((sum, item) => sum + Number(item.difference || 0), 0)
    return { reconciledCount, discrepancyCount, totalDifference }
  }, [reconciliations])

  useEffect(() => {
    const currentPageIds = new Set(transactions.map((transaction) => transaction.id))
    setSelectedTransactionIds((prev) => prev.filter((id) => currentPageIds.has(id)))
  }, [transactions])

  useEffect(() => {
    if (!guidePreferenceKey) return
    const hidden = localStorage.getItem(guidePreferenceKey) === 'hidden'
    setShowUsageGuide(!hidden)
  }, [guidePreferenceKey])

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (
      tabParam === 'transactions' ||
      tabParam === 'categories' ||
      tabParam === 'accounts' ||
      tabParam === 'payment-methods' ||
      tabParam === 'reconciliations'
    ) {
      setTab(tabParam)
    }

    const residentContractIdParam = searchParams.get('residentContractId')
    if (residentContractIdParam !== null) {
      setTransactionResidentContractId(residentContractIdParam)
    }

    const statusParam = searchParams.get('status')
    if (
      statusParam === '' ||
      statusParam === 'PENDING' ||
      statusParam === 'PAID' ||
      statusParam === 'OVERDUE' ||
      statusParam === 'CANCELLED' ||
      statusParam === 'REFUNDED' ||
      statusParam === 'PARTIALLY_PAID'
    ) {
      setTransactionStatus(statusParam)
    }

    const dueDateFromParam = searchParams.get('dueDateFrom')
    if (dueDateFromParam !== null) {
      setDueDateFrom(dueDateFromParam)
    }

    const dueDateToParam = searchParams.get('dueDateTo')
    if (dueDateToParam !== null) {
      setDueDateTo(dueDateToParam)
    }

    const searchParam = searchParams.get('search')
    if (searchParam !== null) {
      setTransactionSearch(searchParam)
    }

    setPage(1)
  }, [searchParams])

  const openCreateCategoryDialog = () => {
    setCategoryForm(emptyCategoryForm)
    setIsCategoryDialogOpen(true)
  }

  const openCreateAccountDialog = () => {
    setAccountForm(emptyAccountForm)
    setIsAccountDialogOpen(true)
  }

  const openCreatePaymentMethodDialog = () => {
    setPaymentMethodForm(emptyPaymentMethodForm)
    setIsPaymentMethodDialogOpen(true)
  }

  const openCreateReconciliationDialog = (prefill?: Partial<ReconciliationFormState>) => {
    setReconciliationForm({
      ...emptyReconciliationForm,
      ...prefill,
    })
    setIsReconciliationDialogOpen(true)
  }

  const openReconciliationDetails = (reconciliationId: string) => {
    setSelectedReconciliationId(reconciliationId)
    setIsReconciliationDetailsOpen(true)
  }

  const openEditAccountDialog = (account: FinancialBankAccount) => {
    setAccountForm({
      id: account.id,
      bankCode: account.bankCode || '',
      bankName: account.bankName,
      branch: account.branch || '',
      accountNumber: account.accountNumber || '',
      accountType: account.accountType,
      accountName: account.accountName,
      pixKey: account.pixKey || '',
      pixKeyType: account.pixKeyType || '',
      isActive: account.isActive,
      isDefault: !!account.isDefault,
      currentBalance: toPtBrDecimalInput(account.currentBalance ?? '0'),
    })
    setIsAccountDialogOpen(true)
  }

  const openEditPaymentMethodDialog = (method: FinancialPaymentMethod) => {
    setPaymentMethodForm({
      id: method.id,
      name: method.name,
      code: method.code,
      description: method.description || '',
      allowsInstallments: !!method.allowsInstallments,
      maxInstallments: method.maxInstallments || 1,
      isActive: method.isActive,
    })
    setIsPaymentMethodDialogOpen(true)
  }

  const openEditCategoryDialog = (category: FinancialCategory) => {
    setCategoryForm({
      id: category.id,
      name: category.name,
      description: category.description || '',
      type: category.type,
      parentCategoryId: category.parentCategoryId || '',
      isActive: category.isActive,
    })
    setIsCategoryDialogOpen(true)
  }

  const openCreateTransactionDialog = () => {
    setTransactionForm({ ...emptyTransactionForm, type: transactionType || 'INCOME' })
    setIsTransactionDialogOpen(true)
  }

  const openEditTransactionDialog = (transaction: FinancialTransaction) => {
    setTransactionForm({
      id: transaction.id,
      type: transaction.type,
      categoryId: transaction.categoryId,
      amount: toPtBrDecimalInput(transaction.amount ?? ''),
      discountAmount: toPtBrDecimalInput(transaction.discountAmount ?? ''),
      lateFeeMode: 'amount',
      lateFeeAmount: toPtBrDecimalInput(transaction.lateFeeAmount ?? ''),
      lateFeePercentage: '',
      issueDate: extractDateOnly(transaction.issueDate),
      dueDate: extractDateOnly(transaction.dueDate),
      competenceMonth: toMonthInput(transaction.competenceMonth),
      paymentMethodId: transaction.paymentMethodId || '',
      bankAccountId: transaction.bankAccountId || '',
      description: transaction.description,
      notes: transaction.notes || '',
    })
    setIsTransactionDialogOpen(true)
  }

  const submitCategory = async () => {
    const payload: CreateCategoryDto | UpdateCategoryDto = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim() || undefined,
      type: categoryForm.type,
      parentCategoryId: categoryForm.parentCategoryId || undefined,
      isActive: categoryForm.isActive,
    }
    if (!categoryForm.name.trim()) {
      toast.error('Informe o nome da categoria')
      return
    }

    if (categoryForm.id) {
      await updateCategory.mutateAsync({ id: categoryForm.id, payload })
    } else {
      await createCategory.mutateAsync(payload as CreateCategoryDto)
    }

    setIsCategoryDialogOpen(false)
    setCategoryForm(emptyCategoryForm)
  }

  const submitAccount = async () => {
    if (!accountForm.bankCode.trim()) {
      toast.error('Informe o código do banco')
      return
    }
    if (!accountForm.bankName.trim()) {
      toast.error('Informe o nome do banco')
      return
    }
    if (!accountForm.branch.trim()) {
      toast.error('Informe a agência')
      return
    }
    if (!accountForm.accountNumber.trim()) {
      toast.error('Informe o número da conta')
      return
    }
    if (!accountForm.accountName.trim()) {
      toast.error('Informe o nome da conta')
      return
    }

    const payload: CreateFinancialAccountDto = {
      bankCode: accountForm.bankCode.trim(),
      bankName: accountForm.bankName.trim(),
      branch: accountForm.branch.trim(),
      accountNumber: accountForm.accountNumber.trim(),
      accountType: accountForm.accountType,
      accountName: accountForm.accountName.trim(),
      pixKey: accountForm.pixKey.trim() || undefined,
      pixKeyType: accountForm.pixKeyType.trim() || undefined,
      isActive: accountForm.isActive,
      isDefault: accountForm.isDefault,
      currentBalance: parsePtBrDecimalToApi(accountForm.currentBalance || '0'),
    }

    if (accountForm.id) {
      await updateAccount.mutateAsync({ id: accountForm.id, payload })
    } else {
      await createAccount.mutateAsync(payload)
    }

    setIsAccountDialogOpen(false)
    setAccountForm(emptyAccountForm)
  }

  const submitPaymentMethod = async () => {
    if (!paymentMethodForm.name.trim()) {
      toast.error('Informe o nome do método')
      return
    }
    if (!paymentMethodForm.code.trim()) {
      toast.error('Informe o código do método')
      return
    }
    if (paymentMethodForm.maxInstallments < 1) {
      toast.error('Máximo de parcelas deve ser maior que zero')
      return
    }

    const payload: CreateFinancialPaymentMethodDto = {
      name: paymentMethodForm.name.trim(),
      code: paymentMethodForm.code.trim(),
      description: paymentMethodForm.description.trim() || undefined,
      requiresManualConfirmation: true,
      allowsInstallments: paymentMethodForm.allowsInstallments,
      maxInstallments: paymentMethodForm.maxInstallments,
      isActive: paymentMethodForm.isActive,
    }

    if (paymentMethodForm.id) {
      await updatePaymentMethod.mutateAsync({ id: paymentMethodForm.id, payload })
    } else {
      await createPaymentMethod.mutateAsync(payload)
    }

    setIsPaymentMethodDialogOpen(false)
    setPaymentMethodForm(emptyPaymentMethodForm)
  }

  const submitReconciliation = async () => {
    if (!reconciliationForm.bankAccountId) {
      toast.error('Selecione uma conta bancária')
      return
    }
    if (!reconciliationForm.startDate || !reconciliationForm.endDate || !reconciliationForm.reconciliationDate) {
      toast.error('Preencha as datas do fechamento')
      return
    }
    if (reconciliationForm.startDate > reconciliationForm.endDate) {
      toast.error('Período inválido: data inicial maior que data final')
      return
    }
    if (
      parsePtBrDecimalToNumber(reconciliationForm.openingBalance) < 0 ||
      parsePtBrDecimalToNumber(reconciliationForm.closingBalance) < 0
    ) {
      toast.error('Saldos não podem ser negativos')
      return
    }

    const payload: CreateFinancialReconciliationDto = {
      bankAccountId: reconciliationForm.bankAccountId,
      reconciliationDate: reconciliationForm.reconciliationDate,
      startDate: reconciliationForm.startDate,
      endDate: reconciliationForm.endDate,
      openingBalance: parsePtBrDecimalToApi(reconciliationForm.openingBalance),
      closingBalance: parsePtBrDecimalToApi(reconciliationForm.closingBalance),
      notes: reconciliationForm.notes.trim() || undefined,
    }

    await createReconciliation.mutateAsync(payload)
    setIsReconciliationDialogOpen(false)
    setReconciliationForm(emptyReconciliationForm)
  }

  const formatMoneyInputValue = (value: string | number | undefined): string => {
    const numeric = Number(value ?? 0)
    if (Number.isNaN(numeric)) return '0.00'
    return numeric.toFixed(2)
  }

  const applySystemBalancesToReconciliationForm = () => {
    const summary = reconciliationSystemSummaryQuery.data?.summary
    if (!summary) {
      toast.error('Saldos do sistema ainda não carregados')
      return
    }

    setReconciliationForm((prev) => ({
      ...prev,
      openingBalance: toPtBrDecimalInput(formatMoneyInputValue(summary.openingBalance)),
      closingBalance: toPtBrDecimalInput(formatMoneyInputValue(summary.closingBalance)),
    }))
  }

  const submitTransaction = async () => {
    if (!transactionForm.categoryId) {
      toast.error('Selecione uma categoria')
      return
    }
    if (
      !transactionForm.amount ||
      parsePtBrDecimalToNumber(transactionForm.amount) <= 0
    ) {
      toast.error('Informe um valor bruto válido')
      return
    }
    if (!transactionForm.description.trim()) {
      toast.error('Informe a descrição da transação')
      return
    }

    const payload: CreateTransactionDto = {
      type: transactionForm.type,
      categoryId: transactionForm.categoryId,
      amount: parsePtBrDecimalToApi(transactionForm.amount),
      discountAmount: transactionForm.discountAmount
        ? parsePtBrDecimalToApi(transactionForm.discountAmount)
        : undefined,
      lateFeeAmount:
        transactionForm.lateFeeMode === 'percentage'
          ? parsePtBrDecimalToNumber(transactionForm.lateFeePercentage || '0') > 0
            ? parsePtBrDecimalToApi(
                (
                  (parsePtBrDecimalToNumber(transactionForm.amount || '0') *
                    parsePtBrDecimalToNumber(transactionForm.lateFeePercentage || '0')) /
                  100
                ).toString(),
              )
            : undefined
          : transactionForm.lateFeeAmount
            ? parsePtBrDecimalToApi(transactionForm.lateFeeAmount)
            : undefined,
      issueDate: transactionForm.issueDate,
      dueDate: transactionForm.dueDate,
      competenceMonth: fromMonthInput(transactionForm.competenceMonth),
      paymentMethodId: transactionForm.paymentMethodId || undefined,
      bankAccountId: transactionForm.bankAccountId || undefined,
      description: transactionForm.description.trim(),
      notes: transactionForm.notes.trim() || undefined,
    }

    if (transactionForm.id) {
      await updateTransaction.mutateAsync({ id: transactionForm.id, payload })
    } else {
      await createTransaction.mutateAsync(payload)
    }

    setIsTransactionDialogOpen(false)
    setTransactionForm(emptyTransactionForm)
  }

  const toggleSelectTransaction = (transactionId: string, checked: boolean) => {
    setSelectedTransactionIds((prev) =>
      checked ? Array.from(new Set([...prev, transactionId])) : prev.filter((id) => id !== transactionId),
    )
  }

  const toggleSelectAllPage = (checked: boolean) => {
    const pageSelectableIds = transactions
      .filter((transaction) => transaction.status !== 'CANCELLED')
      .map((transaction) => transaction.id)

    setSelectedTransactionIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...pageSelectableIds]))
      }
      return prev.filter((id) => !pageSelectableIds.includes(id))
    })
  }

  const handleOpenMarkPaid = (transaction: FinancialTransaction) => {
    setTransactionToMarkPaid(transaction)
    setMarkPaidDate(getCurrentDate())
    setIsMarkPaidDialogOpen(true)
  }

  const openBatchMarkPaid = () => {
    if (selectedTransactionIds.length === 0) return
    setTransactionToMarkPaid(null)
    setMarkPaidDate(getCurrentDate())
    setIsMarkPaidDialogOpen(true)
  }

  const handleMarkPaid = async () => {
    if (!markPaidDate) {
      toast.error('Informe a data de pagamento')
      return
    }

    if (transactionToMarkPaid) {
      await markPaid.mutateAsync({ id: transactionToMarkPaid.id, payload: { paymentDate: markPaidDate } })
    } else if (selectedTransactionIds.length > 0) {
      const batch = transactions.filter(
        (transaction) =>
          selectedTransactionIds.includes(transaction.id) &&
          transaction.status !== 'PAID' &&
          transaction.status !== 'CANCELLED',
      )

      await Promise.all(
        batch.map((transaction) =>
          markPaid.mutateAsync({ id: transaction.id, payload: { paymentDate: markPaidDate } }),
        ),
      )
    }

    setIsMarkPaidDialogOpen(false)
    setTransactionToMarkPaid(null)
    setSelectedTransactionIds([])
  }

  const handleCancelTransaction = async () => {
    if (!transactionToCancel) return
    await cancelTransaction.mutateAsync(transactionToCancel.id)
    setTransactionToCancel(null)
    setSelectedTransactionIds((prev) => prev.filter((id) => id !== transactionToCancel.id))
  }

  const handleBatchCancelTransactions = async () => {
    const batch = transactions.filter(
      (transaction) =>
        selectedTransactionIds.includes(transaction.id) &&
        transaction.status !== 'CANCELLED',
    )

    if (batch.length === 0) {
      setIsBatchCancelDialogOpen(false)
      return
    }

    await Promise.all(batch.map((transaction) => cancelTransaction.mutateAsync(transaction.id)))
    setIsBatchCancelDialogOpen(false)
    setSelectedTransactionIds([])
  }

  const handleToggleCategoryActive = async () => {
    if (!categoryToToggle) return
    await updateCategory.mutateAsync({ id: categoryToToggle.id, payload: { isActive: !categoryToToggle.isActive } })
    setCategoryToToggle(null)
  }

  const handleToggleAccountActive = async () => {
    if (!accountToToggle) return
    await updateAccount.mutateAsync({
      id: accountToToggle.id,
      payload: { isActive: !accountToToggle.isActive },
    })
    setAccountToToggle(null)
  }

  const handleTogglePaymentMethodActive = async () => {
    if (!paymentMethodToToggle) return
    await updatePaymentMethod.mutateAsync({
      id: paymentMethodToToggle.id,
      payload: { isActive: !paymentMethodToToggle.isActive },
    })
    setPaymentMethodToToggle(null)
  }

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return
    await deleteCategory.mutateAsync(categoryToDelete.id)
    setCategoryToDelete(null)
  }

  const totalPages = pagination?.totalPages || 1
  const reconciliationTotalPages = reconciliationPagination?.totalPages || 1
  const pageCountLabelByTab: Record<typeof tab, string> = {
    transactions: 'Transações exibidas na página',
    reconciliations: 'Fechamentos exibidos na página',
    'payment-methods': 'Métodos exibidos na página',
    accounts: 'Contas exibidas na página',
    categories: 'Categorias exibidas na página',
  }
  const pageCountValueByTab: Record<typeof tab, number> = {
    transactions: transactions.length,
    reconciliations: reconciliations.length,
    'payment-methods': paymentMethodsCatalog.length,
    accounts: accounts.length,
    categories: categories.length,
  }

  const openAccountStatement = (account: FinancialBankAccount) => {
    const today = getCurrentDate()
    const monthStart = `${today.slice(0, 7)}-01`

    setAccountForStatement(account)
    setStatementFromDateInput(monthStart)
    setStatementToDateInput(today)
    setStatementFromDate(monthStart)
    setStatementToDate(today)
    setIsAccountStatementOpen(true)
  }

  const openCreateReconciliationDialogWithUnreconciledFilters = () => {
    const targetBankAccountId = unreconciledBankAccountFilter
    const targetReconciliationDate = unreconciledToDate || getCurrentDate()

    const maybeDuplicate = reconciliations.find(
      (item) =>
        item.bankAccountId === targetBankAccountId &&
        extractDateOnly(item.reconciliationDate) === targetReconciliationDate,
    )

    if (targetBankAccountId && maybeDuplicate) {
      toast.warning(
        'Já existe fechamento desta conta para a data selecionada. Ajuste o período ou revise o fechamento existente.',
      )
      return
    }

    openCreateReconciliationDialog({
      bankAccountId: targetBankAccountId,
      startDate: unreconciledFromDate || getCurrentDate(),
      endDate: unreconciledToDate || getCurrentDate(),
      reconciliationDate: targetReconciliationDate,
    })
  }

  const hideUsageGuide = () => {
    if (guidePreferenceKey) {
      localStorage.setItem(guidePreferenceKey, 'hidden')
    }
    setShowUsageGuide(false)
  }

  const showUsageGuideAgain = () => {
    if (guidePreferenceKey) {
      localStorage.removeItem(guidePreferenceKey)
    }
    setShowUsageGuide(true)
  }

  const categorySubmitDisabledReason = !categoryForm.name.trim()
    ? 'Informe o nome da categoria.'
    : undefined
  const accountSubmitDisabledReason = !accountForm.bankCode.trim()
    ? 'Informe o código do banco.'
    : !accountForm.bankName.trim()
      ? 'Informe o nome do banco.'
      : !accountForm.branch.trim()
        ? 'Informe a agência.'
        : !accountForm.accountNumber.trim()
          ? 'Informe o número da conta.'
          : !accountForm.accountName.trim()
            ? 'Informe o nome da conta.'
            : undefined
  const paymentMethodSubmitDisabledReason = !paymentMethodForm.name.trim()
    ? 'Informe o nome do método.'
    : !paymentMethodForm.code.trim()
      ? 'Informe o código do método.'
      : undefined
  const reconciliationSubmitDisabledReason = !reconciliationForm.bankAccountId
    ? 'Selecione a conta bancária.'
    : !reconciliationForm.reconciliationDate || !reconciliationForm.startDate || !reconciliationForm.endDate
      ? 'Preencha as datas do fechamento.'
      : !reconciliationForm.openingBalance || !reconciliationForm.closingBalance
        ? 'Preencha os saldos de abertura e fechamento.'
        : undefined
  const transactionSubmitDisabledReason = !transactionForm.categoryId
    ? 'Selecione a categoria.'
    : !transactionForm.amount || parsePtBrDecimalToNumber(transactionForm.amount) <= 0
      ? 'Informe um valor bruto maior que zero.'
      : !transactionForm.description.trim()
        ? 'Informe a descrição da transação.'
        : undefined

  return (
    <Page maxWidth="wide">
      <PageHeader
        title="Financeiro Operacional"
        subtitle="Gestão de categorias e transações financeiras da operação da ILPI"
        actions={
          tab === 'transactions' ? (
            <Button onClick={openCreateTransactionDialog} disabled={!canManageTransactions}>
              <Plus className="h-4 w-4 mr-2" />
              Nova transação
            </Button>
          ) : tab === 'reconciliations' ? (
            <Button onClick={openCreateReconciliationDialog} disabled={!canManageReconciliation}>
              <Plus className="h-4 w-4 mr-2" />
              Novo fechamento
            </Button>
          ) : tab === 'payment-methods' ? (
            <Button onClick={openCreatePaymentMethodDialog} disabled={!canManageAccounts}>
              <Plus className="h-4 w-4 mr-2" />
              Novo método
            </Button>
          ) : tab === 'accounts' ? (
            <Button onClick={openCreateAccountDialog} disabled={!canManageAccounts}>
              <Plus className="h-4 w-4 mr-2" />
              Nova conta
            </Button>
          ) : (
            <Button onClick={openCreateCategoryDialog} disabled={!canManageCategories}>
              <Plus className="h-4 w-4 mr-2" />
              Nova categoria
            </Button>
          )
        }
      />

      {showUsageGuide ? (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Como usar o Financeiro Operacional</p>
                <p className="text-sm text-muted-foreground">
                  1) Cadastre categorias e conta bancária. 2) Lance transações e confirme pagamentos.
                  3) Gere fechamento para validar saldo do período.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={hideUsageGuide} aria-label="Fechar instruções">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="mb-4">
          <Button variant="outline" size="sm" onClick={showUsageGuideAgain} className="gap-2">
            <CircleHelp className="h-4 w-4" />
            Mostrar instruções de uso
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Novo no módulo?
            </span>
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Categorias de receita ativas</p>
            <p className="text-2xl font-semibold mt-1">{activeCategoryStats.income}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Categorias de despesa ativas</p>
            <p className="text-2xl font-semibold mt-1">{activeCategoryStats.expense}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{pageCountLabelByTab[tab]}</p>
            <p className="text-2xl font-semibold mt-1">{pageCountValueByTab[tab]}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as 'transactions' | 'categories' | 'accounts' | 'payment-methods' | 'reconciliations')}>
        <TabsList>
          <TabsTrigger value="transactions" className="gap-2">
            <Wallet className="h-4 w-4" /> Transações
          </TabsTrigger>
          <TabsTrigger value="reconciliations" className="gap-2">
            <Scale className="h-4 w-4" /> Fechamento
          </TabsTrigger>
          <TabsTrigger value="payment-methods" className="gap-2">
            <CreditCard className="h-4 w-4" /> Métodos
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <Landmark className="h-4 w-4" /> Contas
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tags className="h-4 w-4" /> Categorias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-6">
          {transactionResidentContractId && (
            <Card className="mb-4">
              <CardContent className="pt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">
                  Exibindo apenas transações do contrato <span className="font-medium">{transactionResidentContractId}</span>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTransactionResidentContractId('')
                    setPage(1)
                  }}
                >
                  Remover filtro de contrato
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Receitas (resultado filtrado)</p>
                <p className="text-2xl font-semibold mt-1">{formatCurrency(transactionSummary.income)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Despesas (resultado filtrado)</p>
                <p className="text-2xl font-semibold mt-1">{formatCurrency(transactionSummary.expense)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Saldo (resultado filtrado)</p>
                <p className="text-2xl font-semibold mt-1">{formatCurrency(transactionSummary.balance)}</p>
              </CardContent>
            </Card>
          </div>

          <TransactionsSection
            transactions={transactions}
            categories={categories.map((category) => ({ id: category.id, name: category.name }))}
            total={pagination?.total || 0}
            page={pagination?.page || 1}
            totalPages={totalPages}
            isLoading={transactionsQuery.isLoading}
            canManageTransactions={canManageTransactions}
            transactionSearch={transactionSearch}
            transactionType={transactionType}
            transactionStatus={transactionStatus}
            transactionCategoryId={transactionCategoryId}
            sortField={sortField}
            sortDirection={sortDirection}
            dueDateFrom={dueDateFrom}
            dueDateTo={dueDateTo}
            onTransactionSearchChange={(value) => {
              setTransactionSearch(value)
              setPage(1)
            }}
            onTransactionTypeChange={(value) => {
              setTransactionType(value)
              setPage(1)
            }}
            onTransactionStatusChange={(value) => {
              setTransactionStatus(value)
              setPage(1)
            }}
            onTransactionCategoryChange={(value) => {
              setTransactionCategoryId(value)
              setPage(1)
            }}
            onSortFieldChange={(value) => {
              setSortField(value)
              setPage(1)
            }}
            onSortDirectionChange={(value) => {
              setSortDirection(value)
              setPage(1)
            }}
            onDueDateFromChange={(value) => {
              setDueDateFrom(value)
              setPage(1)
            }}
            onDueDateToChange={(value) => {
              setDueDateTo(value)
              setPage(1)
            }}
            onClearFilters={() => {
              setTransactionType('')
              setTransactionStatus('')
              setTransactionCategoryId('')
              setTransactionResidentContractId('')
              setSortField('dueDate')
              setSortDirection('asc')
              setTransactionSearch('')
              setDueDateFrom('')
              setDueDateTo('')
              setPage(1)
            }}
            onCreateFirst={openCreateTransactionDialog}
            onPreviousPage={() => setPage((current) => current - 1)}
            onNextPage={() => setPage((current) => current + 1)}
            onEdit={openEditTransactionDialog}
            onOpenMarkPaid={handleOpenMarkPaid}
            onOpenCancel={setTransactionToCancel}
            selectedTransactionIds={selectedTransactionIds}
            onToggleSelectTransaction={toggleSelectTransaction}
            onToggleSelectAllPage={toggleSelectAllPage}
            onOpenBatchMarkPaid={openBatchMarkPaid}
            onOpenBatchCancel={() => setIsBatchCancelDialogOpen(true)}
            formatDateOnly={formatDateOnly}
            formatCurrency={formatCurrency}
            statusLabel={statusLabel}
          />
        </TabsContent>

        <TabsContent value="payment-methods" className="mt-6">
          <PaymentMethodsSection
            methods={paymentMethodsCatalog}
            isLoading={paymentMethodsCatalogQuery.isLoading}
            methodSearch={paymentMethodSearch}
            showInactiveMethods={showInactivePaymentMethods}
            canManageAccounts={canManageAccounts}
            onMethodSearchChange={setPaymentMethodSearch}
            onShowInactiveMethodsChange={setShowInactivePaymentMethods}
            onClearFilters={() => {
              setPaymentMethodSearch('')
              setShowInactivePaymentMethods(false)
            }}
            onEdit={openEditPaymentMethodDialog}
            onToggle={setPaymentMethodToToggle}
          />
        </TabsContent>

        <TabsContent value="reconciliations" className="mt-6">
          <Card className="mb-4">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                O fechamento compara o saldo informado no banco com o saldo calculado pelo sistema para o período.
                Use esta aba no fechamento diário/semanal para validar caixa e identificar divergências.
                A diferença é calculada como: <strong>informado - sistema</strong>.
              </p>
            </CardContent>
          </Card>

          <UnreconciledPaidTransactionsSection
            items={unreconciledPaidTransactions}
            total={unreconciledPaidTransactionsQuery.data?.summary.total || 0}
            isLoading={unreconciledPaidTransactionsQuery.isLoading}
            bankAccounts={bankAccounts}
            bankAccountFilter={unreconciledBankAccountFilter}
            search={unreconciledSearch}
            fromDate={unreconciledFromDate}
            toDate={unreconciledToDate}
            onBankAccountFilterChange={setUnreconciledBankAccountFilter}
            onSearchChange={setUnreconciledSearch}
            onFromDateChange={setUnreconciledFromDate}
            onToDateChange={setUnreconciledToDate}
            onClearFilters={() => {
              setUnreconciledBankAccountFilter('')
              setUnreconciledSearch('')
              setUnreconciledFromDate(`${getCurrentDate().slice(0, 7)}-01`)
              setUnreconciledToDate(getCurrentDate())
            }}
            onOpenReconciliationWithFilters={openCreateReconciliationDialogWithUnreconciledFilters}
            formatCurrency={formatCurrency}
            formatDateOnly={formatDateOnly}
          />

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Fechadas (resultado filtrado)</p>
                <p className="text-2xl font-semibold mt-1">{reconciliationSummary.reconciledCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Com divergência (resultado filtrado)</p>
                <p className="text-2xl font-semibold mt-1">{reconciliationSummary.discrepancyCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Ajuste acumulado (informado - sistema)</p>
                <p className={`text-2xl font-semibold mt-1 ${reconciliationSummary.totalDifference === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(reconciliationSummary.totalDifference)}
                </p>
              </CardContent>
            </Card>
          </div>

          <ReconciliationsSection
            reconciliations={reconciliations}
            bankAccounts={bankAccounts}
            total={reconciliationPagination?.total || 0}
            page={reconciliationPagination?.page || 1}
            totalPages={reconciliationTotalPages}
            isLoading={reconciliationsQuery.isLoading}
            reconciliationStatusFilter={reconciliationStatusFilter}
            reconciliationBankAccountFilter={reconciliationBankAccountFilter}
            onStatusFilterChange={(value) => {
              setReconciliationStatusFilter(value)
              setReconciliationPage(1)
            }}
            onBankAccountFilterChange={(value) => {
              setReconciliationBankAccountFilter(value)
              setReconciliationPage(1)
            }}
            onClearFilters={() => {
              setReconciliationStatusFilter('')
              setReconciliationBankAccountFilter('')
              setReconciliationPage(1)
            }}
            onPreviousPage={() => setReconciliationPage((current) => current - 1)}
            onNextPage={() => setReconciliationPage((current) => current + 1)}
            formatDateOnly={formatDateOnly}
            formatCurrency={formatCurrency}
            reconciliationStatusLabel={reconciliationStatusLabel}
            onView={openReconciliationDetails}
          />
        </TabsContent>

        <TabsContent value="accounts" className="mt-6">
          <AccountsSection
            accounts={accounts}
            isLoading={accountsQuery.isLoading}
            accountSearch={accountSearch}
            accountTypeFilter={accountTypeFilter}
            showInactiveAccounts={showInactiveAccounts}
            canManageAccounts={canManageAccounts}
            onAccountSearchChange={setAccountSearch}
            onAccountTypeFilterChange={setAccountTypeFilter}
            onShowInactiveAccountsChange={setShowInactiveAccounts}
            onClearFilters={() => {
              setAccountTypeFilter('')
              setAccountSearch('')
              setShowInactiveAccounts(false)
            }}
            onEdit={openEditAccountDialog}
            onToggle={setAccountToToggle}
            onViewStatement={openAccountStatement}
            accountTypeLabel={accountTypeLabel}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategoriesSection
            categories={categories}
            categoryById={categoryById}
            categorySearch={categorySearch}
            categoryFilterType={categoryFilterType}
            showInactiveCategories={showInactiveCategories}
            canManageCategories={canManageCategories}
            onCategorySearchChange={setCategorySearch}
            onCategoryFilterTypeChange={setCategoryFilterType}
            onShowInactiveChange={setShowInactiveCategories}
            onClearFilters={() => {
              setCategoryFilterType('')
              setCategorySearch('')
              setShowInactiveCategories(false)
            }}
            onEdit={openEditCategoryDialog}
            onToggle={setCategoryToToggle}
            onDelete={setCategoryToDelete}
            typeLabel={typeLabel}
          />
        </TabsContent>
      </Tabs>

      <FinancialCategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        form={categoryForm}
        setForm={(updater) => setCategoryForm((prev) => updater(prev))}
        categories={categories}
        onSubmit={submitCategory}
        isSubmitting={createCategory.isPending || updateCategory.isPending}
        canSubmit={categoryForm.name.trim().length > 0}
        submitDisabledReason={categorySubmitDisabledReason}
      />

      <FinancialAccountDialog
        open={isAccountDialogOpen}
        onOpenChange={setIsAccountDialogOpen}
        form={accountForm}
        setForm={(updater) => setAccountForm((prev) => updater(prev))}
        onSubmit={submitAccount}
        isSubmitting={createAccount.isPending || updateAccount.isPending}
        canSubmit={
          !!accountForm.bankCode.trim() &&
          !!accountForm.bankName.trim() &&
          !!accountForm.branch.trim() &&
          !!accountForm.accountNumber.trim() &&
          !!accountForm.accountName.trim()
        }
        submitDisabledReason={accountSubmitDisabledReason}
      />

      <FinancialAccountStatementDialog
        open={isAccountStatementOpen}
        onOpenChange={(open) => {
          setIsAccountStatementOpen(open)
          if (!open) {
            setAccountForStatement(null)
          }
        }}
        account={accountForStatement}
        statement={accountStatementQuery.data}
        fromDate={statementFromDateInput}
        toDate={statementToDateInput}
        onFromDateChange={setStatementFromDateInput}
        onToDateChange={setStatementToDateInput}
        onApplyFilter={() => {
          if (!statementFromDateInput || !statementToDateInput) {
            toast.error('Informe o período inicial e final')
            return
          }
          if (statementFromDateInput > statementToDateInput) {
            toast.error('Período inválido: data inicial maior que data final')
            return
          }
          setStatementFromDate(statementFromDateInput)
          setStatementToDate(statementToDateInput)
        }}
        isLoading={accountStatementQuery.isLoading || accountStatementQuery.isFetching}
        formatCurrency={formatCurrency}
        formatDateOnly={formatDateOnly}
      />

      <FinancialPaymentMethodDialog
        open={isPaymentMethodDialogOpen}
        onOpenChange={setIsPaymentMethodDialogOpen}
        form={paymentMethodForm}
        setForm={(updater) => setPaymentMethodForm((prev) => updater(prev))}
        onSubmit={submitPaymentMethod}
        isSubmitting={createPaymentMethod.isPending || updatePaymentMethod.isPending}
        canSubmit={!!paymentMethodForm.name.trim() && !!paymentMethodForm.code.trim()}
        submitDisabledReason={paymentMethodSubmitDisabledReason}
      />

      <FinancialReconciliationDialog
        open={isReconciliationDialogOpen}
        onOpenChange={setIsReconciliationDialogOpen}
        form={reconciliationForm}
        setForm={(updater) => setReconciliationForm((prev) => updater(prev))}
        bankAccounts={bankAccounts}
        onSubmit={submitReconciliation}
        onApplySystemBalances={applySystemBalancesToReconciliationForm}
        isSubmitting={createReconciliation.isPending}
        isSystemSummaryLoading={reconciliationSystemSummaryQuery.isLoading}
        systemSummary={reconciliationSystemSummaryQuery.data?.summary
          ? {
              openingBalance: formatCurrency(reconciliationSystemSummaryQuery.data.summary.openingBalance),
              closingBalance: formatCurrency(reconciliationSystemSummaryQuery.data.summary.closingBalance),
              periodNetImpact: formatCurrency(reconciliationSystemSummaryQuery.data.summary.periodNetImpact),
            }
          : undefined}
        canSubmit={
          !!reconciliationForm.bankAccountId &&
          !!reconciliationForm.reconciliationDate &&
          !!reconciliationForm.startDate &&
          !!reconciliationForm.endDate &&
          !!reconciliationForm.openingBalance &&
          !!reconciliationForm.closingBalance
        }
        submitDisabledReason={reconciliationSubmitDisabledReason}
      />

      <ReconciliationDetailsDialog
        open={isReconciliationDetailsOpen}
        onOpenChange={(open) => {
          setIsReconciliationDetailsOpen(open)
          if (!open) {
            setSelectedReconciliationId(null)
          }
        }}
        reconciliation={reconciliationDetailsQuery.data}
        isLoading={reconciliationDetailsQuery.isLoading}
        formatDateOnly={formatDateOnly}
        formatCurrency={formatCurrency}
        statusLabel={statusLabel}
        typeLabel={typeLabel}
      />

      <FinancialTransactionDialog
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
        form={transactionForm}
        setForm={(updater) => setTransactionForm((prev) => updater(prev))}
        compatibleCategories={compatibleCategories}
        paymentMethods={transactionPaymentMethods}
        bankAccounts={bankAccounts}
        onSubmit={submitTransaction}
        isSubmitting={createTransaction.isPending || updateTransaction.isPending}
        canSubmit={
          !!transactionForm.categoryId &&
          !!transactionForm.description.trim() &&
          !!transactionForm.amount &&
          parsePtBrDecimalToNumber(transactionForm.amount) > 0
        }
        submitDisabledReason={transactionSubmitDisabledReason}
      />

      <MarkTransactionPaidDialog
        open={isMarkPaidDialogOpen}
        onOpenChange={(open) => {
          setIsMarkPaidDialogOpen(open)
          if (!open) {
            setTransactionToMarkPaid(null)
          }
        }}
        paymentDate={markPaidDate}
        transactionDescription={transactionToMarkPaid?.description}
        contextLabel={!transactionToMarkPaid && selectedTransactionIds.length > 0 ? `${selectedTransactionIds.length} transação(ões)` : undefined}
        onPaymentDateChange={setMarkPaidDate}
        onConfirm={handleMarkPaid}
        isSubmitting={markPaid.isPending}
      />

      <AlertDialog open={!!transactionToCancel} onOpenChange={(open) => !open && setTransactionToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar transação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação muda o status da transação para cancelada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelTransaction}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!categoryToToggle} onOpenChange={(open) => !open && setCategoryToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{categoryToToggle?.isActive ? 'Desativar categoria?' : 'Ativar categoria?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryToToggle?.isActive
                ? 'Categorias inativas não aparecem por padrão nos lançamentos.'
                : 'A categoria voltará a ficar disponível nos lançamentos.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleCategoryActive}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!accountToToggle} onOpenChange={(open) => !open && setAccountToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{accountToToggle?.isActive ? 'Desativar conta?' : 'Ativar conta?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {accountToToggle?.isActive
                ? 'A conta inativa deixa de aparecer para novos lançamentos.'
                : 'A conta voltará a ficar disponível para novos lançamentos.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleAccountActive}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!paymentMethodToToggle} onOpenChange={(open) => !open && setPaymentMethodToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{paymentMethodToToggle?.isActive ? 'Desativar método?' : 'Ativar método?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {paymentMethodToToggle?.isActive
                ? 'O método inativo deixa de aparecer para novos lançamentos.'
                : 'O método voltará a ficar disponível para novos lançamentos.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleTogglePaymentMethodActive}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria será removida (soft delete). Se estiver vinculada a transações, a remoção será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteCategory}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBatchCancelDialogOpen} onOpenChange={setIsBatchCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar transações selecionadas?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedTransactionIds.length} transação(ões) selecionada(s) serão marcadas como canceladas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchCancelTransactions}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}
