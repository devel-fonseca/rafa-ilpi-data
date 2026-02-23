export type PrismaConnectionOptions = {
  connectionLimit?: number
  poolTimeoutSeconds?: number
  connectTimeoutSeconds?: number
  statementTimeoutMs?: number
  pgBouncer?: boolean
}

function getPositiveInteger(
  env: Record<string, string | undefined>,
  key: string,
): number | undefined {
  const raw = env[key]
  if (!raw) return undefined

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.floor(parsed)
}

function getBoolean(
  env: Record<string, string | undefined>,
  key: string,
): boolean | undefined {
  const raw = env[key]
  if (!raw) return undefined

  const normalized = raw.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return undefined
}

export function readPrismaConnectionOptionsFromEnv(
  env: Record<string, string | undefined> = process.env,
): PrismaConnectionOptions {
  return {
    connectionLimit: getPositiveInteger(env, 'PRISMA_DB_CONNECTION_LIMIT'),
    poolTimeoutSeconds: getPositiveInteger(env, 'PRISMA_DB_POOL_TIMEOUT_SECONDS'),
    connectTimeoutSeconds: getPositiveInteger(
      env,
      'PRISMA_DB_CONNECT_TIMEOUT_SECONDS',
    ),
    statementTimeoutMs: getPositiveInteger(env, 'PRISMA_DB_STATEMENT_TIMEOUT_MS'),
    pgBouncer: getBoolean(env, 'PRISMA_DB_PGBOUNCER'),
  }
}

export function buildPrismaDatabaseUrl(
  baseUrl: string,
  input?: {
    schemaName?: string
    options?: PrismaConnectionOptions
  },
): string {
  const url = new URL(baseUrl)
  const options = input?.options || {}

  if (input?.schemaName) {
    url.searchParams.set('schema', input.schemaName)
  }

  if (options.connectionLimit) {
    url.searchParams.set('connection_limit', String(options.connectionLimit))
  }
  if (options.poolTimeoutSeconds) {
    url.searchParams.set('pool_timeout', String(options.poolTimeoutSeconds))
  }
  if (options.connectTimeoutSeconds) {
    url.searchParams.set('connect_timeout', String(options.connectTimeoutSeconds))
  }
  if (options.statementTimeoutMs) {
    url.searchParams.set('statement_timeout', String(options.statementTimeoutMs))
  }
  if (typeof options.pgBouncer === 'boolean') {
    url.searchParams.set('pgbouncer', options.pgBouncer ? 'true' : 'false')
  }

  return url.toString()
}

export function getPrismaConnectionOptionsForLog(
  options: PrismaConnectionOptions,
): Record<string, number | boolean> {
  return Object.entries(options).reduce<Record<string, number | boolean>>(
    (acc, [key, value]) => {
      if (typeof value === 'number' || typeof value === 'boolean') {
        acc[key] = value
      }
      return acc
    },
    {},
  )
}
