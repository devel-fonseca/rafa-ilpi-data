import { api } from '@/services/api'
import type {
  CreateFinancialReconciliationDto,
  CreateFinancialAccountDto,
  CreateFinancialPaymentMethodDto,
  CreateCategoryDto,
  FinancialBankAccount,
  CreateTransactionDto,
  FinancialCategory,
  FinancialPaymentMethod,
  FinancialReconciliation,
  FinancialAccountStatement,
  FinancialTransaction,
  ListCategoriesQuery,
  ListBankAccountsQuery,
  ListTransactionsQuery,
  ListTransactionsResponse,
  ListPaymentMethodsQuery,
  ListReconciliationsQuery,
  ListReconciliationsResponse,
  ListUnreconciledPaidTransactionsQuery,
  ListUnreconciledPaidTransactionsResponse,
  QueryAccountStatementDto,
  MarkTransactionPaidDto,
  UpdateFinancialAccountDto,
  UpdateFinancialPaymentMethodDto,
  UpdateCategoryDto,
  UpdateTransactionDto,
} from '@/types/financial-operations'

function appendQuery(params: URLSearchParams, key: string, value: string | number | boolean | undefined) {
  if (value === undefined || value === null || value === '') return
  params.append(key, String(value))
}

class FinancialOperationsApi {
  async listReconciliations(query: ListReconciliationsQuery = {}): Promise<ListReconciliationsResponse> {
    const params = new URLSearchParams()
    appendQuery(params, 'bankAccountId', query.bankAccountId)
    appendQuery(params, 'status', query.status)
    appendQuery(params, 'page', query.page)
    appendQuery(params, 'limit', query.limit)
    const queryString = params.toString()
    const response = await api.get(`/financial/reconciliations${queryString ? `?${queryString}` : ''}`)
    return response.data
  }

  async listUnreconciledPaidTransactions(
    query: ListUnreconciledPaidTransactionsQuery = {},
  ): Promise<ListUnreconciledPaidTransactionsResponse> {
    const params = new URLSearchParams()
    appendQuery(params, 'bankAccountId', query.bankAccountId)
    appendQuery(params, 'fromDate', query.fromDate)
    appendQuery(params, 'toDate', query.toDate)
    appendQuery(params, 'search', query.search)
    appendQuery(params, 'page', query.page)
    appendQuery(params, 'limit', query.limit)
    const queryString = params.toString()
    const response = await api.get(`/financial/reconciliations/unreconciled-paid${queryString ? `?${queryString}` : ''}`)
    return response.data
  }

  async getReconciliation(id: string): Promise<FinancialReconciliation> {
    const response = await api.get(`/financial/reconciliations/${id}`)
    return response.data
  }

  async createReconciliation(payload: CreateFinancialReconciliationDto): Promise<FinancialReconciliation> {
    const response = await api.post('/financial/reconciliations', payload)
    return response.data
  }

  async listAccounts(query: ListBankAccountsQuery = {}): Promise<FinancialBankAccount[]> {
    const params = new URLSearchParams()
    appendQuery(params, 'accountType', query.accountType)
    appendQuery(params, 'search', query.search)
    appendQuery(params, 'activeOnly', query.activeOnly)
    const queryString = params.toString()
    const response = await api.get(`/financial/accounts${queryString ? `?${queryString}` : ''}`)
    return response.data
  }

  async getAccountStatement(id: string, query: QueryAccountStatementDto = {}): Promise<FinancialAccountStatement> {
    const params = new URLSearchParams()
    appendQuery(params, 'fromDate', query.fromDate)
    appendQuery(params, 'toDate', query.toDate)
    const queryString = params.toString()
    const response = await api.get(`/financial/accounts/${id}/statement${queryString ? `?${queryString}` : ''}`)
    return response.data
  }

  async listPaymentMethodsCatalog(query: ListPaymentMethodsQuery = {}): Promise<FinancialPaymentMethod[]> {
    const params = new URLSearchParams()
    appendQuery(params, 'search', query.search)
    appendQuery(params, 'activeOnly', query.activeOnly)
    const queryString = params.toString()
    const response = await api.get(`/financial/payment-methods${queryString ? `?${queryString}` : ''}`)
    return response.data
  }

  async createPaymentMethod(payload: CreateFinancialPaymentMethodDto): Promise<FinancialPaymentMethod> {
    const response = await api.post('/financial/payment-methods', payload)
    return response.data
  }

  async updatePaymentMethod(id: string, payload: UpdateFinancialPaymentMethodDto): Promise<FinancialPaymentMethod> {
    const response = await api.patch(`/financial/payment-methods/${id}`, payload)
    return response.data
  }

  async createAccount(payload: CreateFinancialAccountDto): Promise<FinancialBankAccount> {
    const response = await api.post('/financial/accounts', payload)
    return response.data
  }

  async updateAccount(id: string, payload: UpdateFinancialAccountDto): Promise<FinancialBankAccount> {
    const response = await api.patch(`/financial/accounts/${id}`, payload)
    return response.data
  }

  async listPaymentMethods(activeOnly = true): Promise<FinancialPaymentMethod[]> {
    const params = new URLSearchParams()
    appendQuery(params, 'activeOnly', activeOnly)
    const queryString = params.toString()
    const response = await api.get(`/financial/reference-data/payment-methods${queryString ? `?${queryString}` : ''}`)
    return response.data
  }

  async listBankAccounts(activeOnly = true): Promise<FinancialBankAccount[]> {
    const params = new URLSearchParams()
    appendQuery(params, 'activeOnly', activeOnly)
    const queryString = params.toString()
    const response = await api.get(`/financial/reference-data/bank-accounts${queryString ? `?${queryString}` : ''}`)
    return response.data
  }

  async listCategories(query: ListCategoriesQuery = {}): Promise<FinancialCategory[]> {
    const params = new URLSearchParams()
    appendQuery(params, 'type', query.type)
    appendQuery(params, 'search', query.search)
    appendQuery(params, 'activeOnly', query.activeOnly)

    const queryString = params.toString()
    const response = await api.get(`/financial/categories${queryString ? `?${queryString}` : ''}`)
    return response.data
  }

  async createCategory(payload: CreateCategoryDto): Promise<FinancialCategory> {
    const response = await api.post('/financial/categories', payload)
    return response.data
  }

  async updateCategory(id: string, payload: UpdateCategoryDto): Promise<FinancialCategory> {
    const response = await api.patch(`/financial/categories/${id}`, payload)
    return response.data
  }

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/financial/categories/${id}`)
  }

  async listTransactions(query: ListTransactionsQuery = {}): Promise<ListTransactionsResponse> {
    const params = new URLSearchParams()
    appendQuery(params, 'type', query.type)
    appendQuery(params, 'status', query.status)
    appendQuery(params, 'categoryId', query.categoryId)
    appendQuery(params, 'residentId', query.residentId)
    appendQuery(params, 'residentContractId', query.residentContractId)
    appendQuery(params, 'dueDateFrom', query.dueDateFrom)
    appendQuery(params, 'dueDateTo', query.dueDateTo)
    appendQuery(params, 'search', query.search)
    appendQuery(params, 'sortField', query.sortField)
    appendQuery(params, 'sortDirection', query.sortDirection)
    appendQuery(params, 'page', query.page)
    appendQuery(params, 'limit', query.limit)

    const queryString = params.toString()
    const response = await api.get(`/financial/transactions${queryString ? `?${queryString}` : ''}`)
    return response.data
  }

  async getTransaction(id: string): Promise<FinancialTransaction> {
    const response = await api.get(`/financial/transactions/${id}`)
    return response.data
  }

  async createTransaction(payload: CreateTransactionDto): Promise<FinancialTransaction> {
    const response = await api.post('/financial/transactions', payload)
    return response.data
  }

  async updateTransaction(id: string, payload: UpdateTransactionDto): Promise<FinancialTransaction> {
    const response = await api.patch(`/financial/transactions/${id}`, payload)
    return response.data
  }

  async markTransactionPaid(id: string, payload: MarkTransactionPaidDto): Promise<FinancialTransaction> {
    const response = await api.post(`/financial/transactions/${id}/mark-paid`, payload)
    return response.data
  }

  async cancelTransaction(id: string): Promise<FinancialTransaction> {
    const response = await api.post(`/financial/transactions/${id}/cancel`)
    return response.data
  }
}

export const financialOperationsApi = new FinancialOperationsApi()
