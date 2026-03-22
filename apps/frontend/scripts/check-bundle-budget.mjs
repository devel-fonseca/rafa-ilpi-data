import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const assetsDir = path.resolve('dist/assets')
const indexHtmlPath = path.resolve('dist/index.html')

const specializedVendorPrefixes = [
  'vendor-axios-',
  'vendor-charts-',
  'vendor-date-',
  'vendor-dnd-',
  'vendor-forms-',
  'vendor-icons-',
  'vendor-markdown-',
  'vendor-pdf-',
  'vendor-query-',
  'vendor-radix-',
  'vendor-router-',
  'vendor-socket-',
  'vendor-sonner-',
  'vendor-tf-',
  'vendor-tiptap-',
  'vendor-zod-',
]

const budgets = [
  { label: 'entry', budgetBytes: 2_150_000, finder: findEntryChunk },
  { label: 'vendor', budgetBytes: 1_250_000, finder: findResidualVendorChunk },
  { label: 'vendor-charts', budgetBytes: 650_000, finder: createPrefixFinder('vendor-charts-') },
  { label: 'vendor-pdf', budgetBytes: 2_350_000, finder: createPrefixFinder('vendor-pdf-') },
  { label: 'vendor-tf', budgetBytes: 2_000_000, finder: createPrefixFinder('vendor-tf-') },
]

const assetFiles = await readdir(assetsDir)
const results = []
const failures = []

for (const rule of budgets) {
  const fileName = await rule.finder(assetFiles)

  if (!fileName) {
    failures.push(`Chunk não encontrado para o orçamento "${rule.label}"`)
    continue
  }

  const filePath = path.join(assetsDir, fileName)
  const { size } = await stat(filePath)

  results.push({ ...rule, fileName, size })

  if (size > rule.budgetBytes) {
    failures.push(
      `${rule.label}: ${formatSize(size)} excede orçamento de ${formatSize(rule.budgetBytes)} (${fileName})`,
    )
  }
}

for (const result of results) {
  const status = result.size > result.budgetBytes ? 'FAIL' : 'OK'
  console.log(
    `[bundle:${status}] ${result.label.padEnd(13)} ${formatSize(result.size).padStart(10)} / ${formatSize(result.budgetBytes).padStart(10)}  ${result.fileName}`,
  )
}

if (failures.length > 0) {
  console.error('\nOrçamento de bundle excedido:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

function createPrefixFinder(prefix) {
  return async (files) => files.find((file) => file.startsWith(prefix) && file.endsWith('.js'))
}

async function findEntryChunk() {
  const indexHtml = await readFile(indexHtmlPath, 'utf8')
  const match = indexHtml.match(/<script type="module" crossorigin src="\/assets\/([^"]+\.js)"><\/script>/)
  return match?.[1]
}

async function findResidualVendorChunk(files) {
  const candidates = files.filter(
    (file) =>
      file.startsWith('vendor-') &&
      file.endsWith('.js') &&
      !specializedVendorPrefixes.some((prefix) => file.startsWith(prefix)),
  )

  if (candidates.length === 0) {
    return null
  }

  if (candidates.length === 1) {
    return candidates[0]
  }

  return candidates.sort((a, b) => a.localeCompare(b))[0]
}

function formatSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
