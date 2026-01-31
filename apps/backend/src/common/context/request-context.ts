import { AsyncLocalStorage } from 'node:async_hooks'

type Store = { requestId?: string; tenantId?: string; userId?: string }

export const requestContext = new AsyncLocalStorage<Store>()

export function getCtx() {
  return requestContext.getStore() || {}
}
