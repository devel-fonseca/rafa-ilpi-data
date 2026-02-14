import { promises as fs } from 'fs'
import * as path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const BACKUP_FILE_EXTENSION = '.sql'
const DEFAULT_BACKUP_ROOT = path.resolve(process.cwd(), '../../backups/superadmin/full')

export type BackupScope = 'full' | 'tenant'

interface BackupMetadata {
  scope: BackupScope
  tenantId?: string
  tenantName?: string
  tenantSchemaName?: string
}

export interface BackupFileInfo {
  id: string
  fileName: string
  filePath: string
  scope: BackupScope
  tenantId: string | null
  tenantName: string | null
  tenantSchemaName: string | null
  sizeBytes: number
  createdAt: string
  updatedAt: string
}

export interface RestoreResult {
  backupId: string | null
  filePath: string
  scope: BackupScope
  targetSchemaName: string | null
  startedAt: string
  finishedAt: string
  durationMs: number
}

function resolveBackupRoot(): string {
  return process.env.SUPERADMIN_BACKUP_DIR?.trim() || DEFAULT_BACKUP_ROOT
}

function parseEnvFile(content: string): Record<string, string> {
  const parsed: Record<string, string> = {}

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const equalIndex = line.indexOf('=')
    if (equalIndex <= 0) continue

    const key = line.slice(0, equalIndex).trim()
    let value = line.slice(equalIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    parsed[key] = value
  }

  return parsed
}

async function tryLoadEnvFiles(): Promise<void> {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.production'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '../../.env.production'),
  ]

  for (const filePath of candidates) {
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const parsed = parseEnvFile(raw)

      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    } catch {
      // Arquivo opcional - ignora
    }
  }
}

function buildBackupFileName(id: string): string {
  return `${id}${BACKUP_FILE_EXTENSION}`
}

function parseBackupId(fileName: string): string | null {
  if (!fileName.endsWith(BACKUP_FILE_EXTENSION)) return null
  return fileName.slice(0, -BACKUP_FILE_EXTENSION.length)
}

function makeBackupId(): string {
  const now = new Date()
  const pad = (v: number) => String(v).padStart(2, '0')
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const randomPart = Math.random().toString(36).slice(2, 8)
  return `full_${datePart}_${timePart}_${randomPart}`
}

async function ensureBackupDirectory(): Promise<string> {
  const backupRoot = resolveBackupRoot()
  await fs.mkdir(backupRoot, { recursive: true })
  return backupRoot
}

async function resolveDatabaseUrl(): Promise<string> {
  await tryLoadEnvFiles()

  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL não configurada. Configure a variável de ambiente ou arquivo .env',
    )
  }

  return databaseUrl
}

function sanitizeTenantIdForFileName(tenantId: string): string {
  return tenantId.replace(/[^a-zA-Z0-9-]/g, '')
}

function parseScopeFromId(id: string): BackupScope {
  return id.startsWith('tenant_') ? 'tenant' : 'full'
}

function buildMetadataPath(id: string): string {
  return path.join(resolveBackupRoot(), `${id}.meta.json`)
}

async function readMetadata(id: string): Promise<BackupMetadata | null> {
  const metadataPath = buildMetadataPath(id)
  try {
    const raw = await fs.readFile(metadataPath, 'utf-8')
    return JSON.parse(raw) as BackupMetadata
  } catch {
    return null
  }
}

async function writeMetadata(id: string, metadata: BackupMetadata): Promise<void> {
  await fs.writeFile(buildMetadataPath(id), JSON.stringify(metadata, null, 2), 'utf-8')
}

function parseTenantIdFromLegacyId(id: string): string | null {
  if (!id.startsWith('tenant_')) return null
  const withoutPrefix = id.slice('tenant_'.length)
  const match = withoutPrefix.match(/^(.+)_\d{8}_\d{6}_[a-z0-9]+$/)
  return match?.[1] || null
}

async function toFileInfo(fileName: string): Promise<BackupFileInfo | null> {
  const id = parseBackupId(fileName)
  if (!id) return null

  const filePath = path.join(resolveBackupRoot(), fileName)
  const stats = await fs.stat(filePath)

  if (!stats.isFile()) return null

  const metadata = await readMetadata(id)
  const scope = metadata?.scope || parseScopeFromId(id)

  return {
    id,
    fileName,
    filePath,
    scope,
    tenantId: metadata?.tenantId || parseTenantIdFromLegacyId(id),
    tenantName: metadata?.tenantName || null,
    tenantSchemaName: metadata?.tenantSchemaName || null,
    sizeBytes: stats.size,
    createdAt: stats.birthtime.toISOString(),
    updatedAt: stats.mtime.toISOString(),
  }
}

async function executePgDumpToFile(
  filePath: string,
  databaseUrl: string,
  extraArgs: string[] = [],
): Promise<void> {
  await execFileAsync(
    'pg_dump',
    [
      `--dbname=${databaseUrl}`,
      '--format=plain',
      '--no-owner',
      '--no-privileges',
      ...extraArgs,
      `--file=${filePath}`,
    ],
    { env: process.env },
  )
}

export async function createFullDatabaseBackup(): Promise<BackupFileInfo> {
  const databaseUrl = await resolveDatabaseUrl()

  const backupRoot = await ensureBackupDirectory()
  const id = makeBackupId().replace(/^full_/, 'full_')
  const fileName = buildBackupFileName(id)
  const filePath = path.join(backupRoot, fileName)

  try {
    await executePgDumpToFile(filePath, databaseUrl)
    await writeMetadata(id, { scope: 'full' })
  } catch (error) {
    // Limpa arquivo parcial em falha de execução
    await fs.unlink(filePath).catch(() => undefined)

    const err = error as { message?: string; stderr?: string }
    const stderr = err.stderr?.trim()
    throw new Error(stderr || err.message || 'Falha ao executar pg_dump')
  }

  const fileInfo = await toFileInfo(fileName)
  if (!fileInfo) {
    throw new Error('Backup gerado, mas o arquivo não foi localizado')
  }

  return fileInfo
}

export async function createTenantDatabaseBackup(params: {
  tenantId: string
  tenantName: string
  tenantSchemaName: string
}): Promise<BackupFileInfo> {
  const databaseUrl = await resolveDatabaseUrl()

  if (!/^tenant_[a-zA-Z0-9_]+$/.test(params.tenantSchemaName)) {
    throw new Error('Schema de tenant inválido para backup')
  }

  const backupRoot = await ensureBackupDirectory()
  const tenantIdSafe = sanitizeTenantIdForFileName(params.tenantId)
  const id = `tenant_${tenantIdSafe}_${makeBackupId().replace(/^full_/, '')}`
  const fileName = buildBackupFileName(id)
  const filePath = path.join(backupRoot, fileName)

  try {
    await executePgDumpToFile(filePath, databaseUrl, [
      `--schema=${params.tenantSchemaName}`,
    ])
    await writeMetadata(id, {
      scope: 'tenant',
      tenantId: params.tenantId,
      tenantName: params.tenantName,
      tenantSchemaName: params.tenantSchemaName,
    })
  } catch (error) {
    await fs.unlink(filePath).catch(() => undefined)

    const err = error as { message?: string; stderr?: string }
    const stderr = err.stderr?.trim()
    throw new Error(stderr || err.message || 'Falha ao executar pg_dump (tenant)')
  }

  const fileInfo = await toFileInfo(fileName)
  if (!fileInfo) {
    throw new Error('Backup de tenant gerado, mas o arquivo não foi localizado')
  }

  return fileInfo
}

export async function listDatabaseBackups(options?: {
  limit?: number
  scope?: BackupScope
  tenantId?: string
}): Promise<BackupFileInfo[]> {
  await ensureBackupDirectory()

  const entries = await fs.readdir(resolveBackupRoot())
  const fileInfos = await Promise.all(entries.map((fileName) => toFileInfo(fileName)))

  const limit = options?.limit ?? 50

  return fileInfos
    .filter((info): info is BackupFileInfo => info !== null)
    .filter((info) => {
      if (options?.scope && info.scope !== options.scope) return false
      if (options?.tenantId && info.tenantId !== options.tenantId) return false
      return true
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, Math.max(1, limit))
}

export async function findDatabaseBackupById(id: string): Promise<BackupFileInfo | null> {
  if (!id || /[^a-zA-Z0-9_-]/.test(id)) {
    return null
  }

  const fileName = buildBackupFileName(id)
  try {
    return await toFileInfo(fileName)
  } catch {
    return null
  }
}

export async function restoreFullDatabaseBackupById(id: string): Promise<RestoreResult> {
  const backup = await findDatabaseBackupById(id)
  if (!backup) {
    throw new Error('Backup não encontrado')
  }

  if (backup.scope !== 'full') {
    throw new Error('A restauração full aceita apenas backups de escopo full')
  }

  return restoreFullDatabaseBackupFromFile(backup.filePath, backup.id)
}

export async function restoreFullDatabaseBackupFromFile(
  filePath: string,
  backupId: string | null = null,
): Promise<RestoreResult> {
  const databaseUrl = await resolveDatabaseUrl()

  const absolutePath = path.resolve(filePath)
  try {
    await fs.access(absolutePath)
  } catch {
    throw new Error(`Arquivo de backup não encontrado: ${absolutePath}`)
  }

  const startedAtDate = new Date()
  try {
    // Full restore deve substituir o estado atual do banco.
    // Primeiro remove todos os schemas de aplicação (incluindo public e tenant_*),
    // preservando apenas schemas internos do PostgreSQL.
    await execFileAsync(
      'psql',
      [
        `--dbname=${databaseUrl}`,
        '--set=ON_ERROR_STOP=1',
        '--command=DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN (\'pg_catalog\', \'information_schema\') AND schema_name NOT LIKE \'pg_toast%\' AND schema_name NOT LIKE \'pg_temp_%\') LOOP EXECUTE format(\'DROP SCHEMA IF EXISTS %I CASCADE\', r.schema_name); END LOOP; EXECUTE \'CREATE SCHEMA IF NOT EXISTS public\'; END $$;',
      ],
      { env: process.env },
    )

    await execFileAsync(
      'psql',
      [
        `--dbname=${databaseUrl}`,
        '--set=ON_ERROR_STOP=1',
        `--file=${absolutePath}`,
      ],
      { env: process.env },
    )
  } catch (error) {
    const err = error as { message?: string; stderr?: string }
    const stderr = err.stderr?.trim()
    throw new Error(stderr || err.message || 'Falha ao executar psql para restore')
  }

  const finishedAtDate = new Date()
  return {
    backupId,
    filePath: absolutePath,
    scope: 'full',
    targetSchemaName: null,
    startedAt: startedAtDate.toISOString(),
    finishedAt: finishedAtDate.toISOString(),
    durationMs: finishedAtDate.getTime() - startedAtDate.getTime(),
  }
}

function validateTenantSchemaName(schemaName: string): void {
  if (!/^tenant_[a-zA-Z0-9_]+$/.test(schemaName)) {
    throw new Error('Schema de tenant inválido para restore')
  }
}

export async function restoreTenantDatabaseBackupById(
  id: string,
  targetSchemaName: string,
): Promise<RestoreResult> {
  const backup = await findDatabaseBackupById(id)
  if (!backup) {
    throw new Error('Backup não encontrado')
  }

  if (backup.scope !== 'tenant') {
    throw new Error('A restauração de tenant aceita apenas backups de escopo tenant')
  }

  return restoreTenantDatabaseBackupFromFile(
    backup.filePath,
    targetSchemaName,
    backup.id,
  )
}

export async function restoreTenantDatabaseBackupFromFile(
  filePath: string,
  targetSchemaName: string,
  backupId: string | null = null,
): Promise<RestoreResult> {
  validateTenantSchemaName(targetSchemaName)

  const databaseUrl = await resolveDatabaseUrl()
  const absolutePath = path.resolve(filePath)

  try {
    await fs.access(absolutePath)
  } catch {
    throw new Error(`Arquivo de backup não encontrado: ${absolutePath}`)
  }

  const startedAtDate = new Date()

  try {
    await execFileAsync(
      'psql',
      [
        `--dbname=${databaseUrl}`,
        '--set=ON_ERROR_STOP=1',
        `--command=DROP SCHEMA IF EXISTS "${targetSchemaName}" CASCADE;`,
      ],
      { env: process.env },
    )

    await execFileAsync(
      'psql',
      [
        `--dbname=${databaseUrl}`,
        '--set=ON_ERROR_STOP=1',
        `--file=${absolutePath}`,
      ],
      { env: process.env },
    )
  } catch (error) {
    const err = error as { message?: string; stderr?: string }
    const stderr = err.stderr?.trim()
    throw new Error(stderr || err.message || 'Falha ao executar restore de tenant')
  }

  const finishedAtDate = new Date()
  return {
    backupId,
    filePath: absolutePath,
    scope: 'tenant',
    targetSchemaName,
    startedAt: startedAtDate.toISOString(),
    finishedAt: finishedAtDate.toISOString(),
    durationMs: finishedAtDate.getTime() - startedAtDate.getTime(),
  }
}
