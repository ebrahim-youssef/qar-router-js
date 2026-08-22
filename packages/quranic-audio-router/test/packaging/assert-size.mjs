// Gzipped size is what a CDN actually ships. Measured at 40 KB for the 254-reciter
// catalog; this guards against a regression, not against the current number.
import { gzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const BUDGET_KB = 48

const bytes = gzipSync(readFileSync(resolve(pkgDir, 'dist/index.js'))).length
const kb = bytes / 1024
console.log(`dist/index.js: ${kb.toFixed(1)} KB gzipped (budget ${BUDGET_KB} KB)`)
if (kb > BUDGET_KB) {
  console.error(`Bundle exceeds budget by ${(kb - BUDGET_KB).toFixed(1)} KB.`)
  process.exit(1)
}
