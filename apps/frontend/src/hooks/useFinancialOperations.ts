import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { tenantKey } from '@/lib/query-keys'
import { financialOperationsApi } from '@/api/financial-operations.api'
import type {
  CreateFinancialReconciliationDto,
  CreateFinancialAccountDto,
  CreateFinancialPaymentMethodDto,
  CreateCategoryDto,
  CreateTransactionDto,
  ListBankAccountsQuery,
  ListCategoriesQuery,
  ListPaymentMethodsQuery,
  QueryAccountStatementDto,
  ListReconciliationsQuery,
  ListUnreconciledPaidTransactionsQuery,
  ListTransactionsQuery,
  MarkTransactionPaidDto,
  UpdateFinancialAccountDto,
  UpdateFinancialPaymentMethodDto,
  UpdateCategoryDto,
  UpdateTransactionDto,
} from '@/types/financial-operations'
import { useAuthStore } from '@/stores/auth.store'

const keys = {
  accounts: (query: ListBankAccountsQuery) =>
    tenantKey('financial-operations', 'accounts', JSON.stringify(query)),
  paymentMethodsCatalog: (query: ListPaymentMethodsQuery) =>
    tenantKey('financial-operations', 'payment-methods-catalog', JSON.stringify(query)),
  reconciliations: (query: ListReconciliationsQuery) =>
    tenantKey('financial-operations', 'reconciliations', JSON.stringify(query)),
  unreconciledPaidTransactions: (query: ListUnreconciledPaidTransactionsQuery) =>
    tenantKey('financial-operations', 'unreconciled-paid-transactions', JSON.stringify(query)),
  reconciliation: (id: string) =>
    tenantKey('financial-operations', 'reconciliation', id),
  paymentMethods: (activeOnly: boolean) =>
    tenantKey('financial-operations', 'payment-methods', String(activeOnly)),
  bankAccounts: (activeOnly: boolean) =>
    tenantKey('financial-operations', 'bank-accounts', String(activeOnly)),
  accountStatement: (id: string, query: QueryAccountStatementDto) =>
    tenantKey('financial-operations', 'account-statement', id, JSON.stringify(query)),
  categories: (query: ListCategoriesQuery) =>
    tenantKey('financial-operations', 'categories', JSON.stringify(query)),
  transactions: (query: ListTransactionsQuery) =>
    tenantKey('financial-operations', 'transactions', JSON.stringify(query)),
  transaction: (id: string) => tenantKey('financial-operations', 'transaction', id),
}

export function useFinancialCategories(query: ListCategoriesQuery = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: keys.categories(query),
    queryFn: () => financialOperationsApi.listCategories(query),
    enabled: isAuthenticated,
  })
}

export function useFinancialAccounts(query: ListBankAccountsQuery = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: keys.accounts(query),
    queryFn: () => financialOperationsApi.listAccounts(query),
    enabled: isAuthenticated,
  })
}

export function useFinancialPaymentMethodsCatalog(query: ListPaymentMethodsQuery = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: keys.paymentMethodsCatalog(query),
    queryFn: () => financialOperationsApi.listPaymentMethodsCatalog(query),
    enabled: isAuthenticated,
  })
}

export function useFinancialReconciliations(query: ListReconciliationsQuery = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: keys.reconciliations(query),
    queryFn: () => financialOperationsApi.listReconciliations(query),
    enabled: isAuthenticated,
  })
}

export function useFinancialUnreconciledPaidTransactions(
  query: ListUnreconciledPaidTransactionsQuery = {},
) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: keys.unreconciledPaidTransactions(query),
    queryFn: () => financialOperationsApi.listUnreconciledPaidTransactions(query),
    enabled: isAuthenticated,
  })
}

export function useFinancialReconciliation(id?: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: keys.reconciliation(id || ''),
    queryFn: () => financialOperationsApi.getReconciliation(id as string),
    enabled: isAuthenticated && !!id,
  })
}

export function useFinancialPaymentMethods(activeOnly = true) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: keys.paymentMethods(activeOnly),
    queryFn: () => financialOperationsApi.listPaymentMethods(activeOnly),
    enabled: isAuthenticated,
  })
}

export function useFinancialBankAccounts(activeOnly = true) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: keys.bankAccounts(activeOnly),
    queryFn: () => financialOperationsApi.listBankAccounts(activeOnly),
    enabled: isAuthenticated,
  })
}

export function useFinancialAccountStatement(id?: string, query: QueryAccountStatementDto = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: keys.accountStatement(id || '', query),
    queryFn: () => financialOperationsApi.getAccountStatement(id as string, query),
    enabled: isAuthenticated && !!id,
  })
}

export function useCreateFinancialAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateFinancialAccountDto) => financialOperationsApi.createAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('financial-operations') })
      toast.success('Conta criada com sucesso')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || 'Erro ao criar conta')
    },
  })
}

export function useCreateFinancialPaymentMethod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateFinancialPaymentMethodDto) => financialOperationsApi.createPaymentMethod(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('financial-operations') })
      toast.success('Método de pagamento criado com sucesso')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || 'Erro ao criar método de pagamento')
    },
  })
}

export function useUpdateFinancialPaymentMethod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFinancialPaymentMethodDto }) =>
      financialOperationsApi.updatePaymentMethod(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('financial-operations') })
      toast.success('Método de pagamento atualizado com sucesso')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || 'Erro ao atualizar método de pagamento')
    },
  })
}

export function useCreateFinancialReconciliation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateFinancialReconciliationDto) => financialOperationsApi.createReconciliation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('financial-operations') })
      toast.success('Fechamento criado com sucesso')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || 'Erro ao criar fechamento')
    },
  })
}

export function useUpdateFinancialAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFinancialAccountDto }) =>
      financialOperationsApi.updateAccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('financial-operations') })
      toast.success('Conta atualizada com sucesso')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || 'Erro ao atualizar conta')
    },
  })
}

export function useFinancialTransactions(
  query: ListTransactionsQuery = {},
  options?: { enabled?: boolean },
) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: keys.transactions(query),
    queryFn: () => financialOperationsApi.listTransactions(query),
    enabled: (options?.enabled ?? true) && isAuthenticated,
  })
}

export function useFinancialTransaction(id?: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: keys.transaction(id || ''),
    queryFn: () => financialOperationsApi.getTransaction(id as string),
    enabled: isAuthenticated && !!id,
  })
}

export function useCreateFinancialCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateCategoryDto) => financialOperationsApi.createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('financial-operations') })
      toast.success('Categoria criada com sucesso')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || 'Erro ao criar categoria')
    },
  })
}

export function useUpdateFinancialCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryDto }) =>
      financialOperationsApi.updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('financial-operations') })
      toast.success('Categoria atualizada com sucesso')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || 'Erro ao atualizar categoria')
    },
  })
}

export function useDeleteFinancialCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => financialOperationsApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('financial-operations') })
      toast.success('Categoria removida com sucesso')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || 'Erro ao remover categoria')
    },
  })
}

export function useCreateFinancialTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateTransactionDto) => financialOperationsApi.createTransaction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('financial-operations') })
      toast.success('Transação criada com sucesso')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || 'Erro ao criar transação')
    },
  })
}

export function useUpdateFinancialTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTransactionDto }) =>
      financialOperationsApi.updateTransaction(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('financial-operations') })
      toast.success('Transação atualizada com sucesso')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || 'Erro ao atualizar transação')
    },
  })
}

export function useMarkFinancialTransactionPaid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MarkTransactionPaidDto }) =>
      financialOperationsApi.markTransactionPaid(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('financial-operations') })
      toast.success('Transação marcada como paga')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || 'Erro ao marcar transação como paga')
    },
  })
}

export function useCancelFinancialTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => financialOperationsApi.cancelTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('financial-operations') })
      toast.success('Transação cancelada com sucesso')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || 'Erro ao cancelar transação')
    },
  })
}
