import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
// The command runs from the package root; this is its equivalent when resolved from scripts/.
const source = new URL('../../../../scraper/data/curated/catalog.json', `file://${here}`).pathname
const destination = new URL('../data/catalog.json', `file://${here}`).pathname
const expected = await readFile(source)

if (process.argv.includes('--check')) {
  let actual: Buffer | undefined
  try { actual = await readFile(destination) } catch { /* handled below */ }
  if (actual === undefined || !actual.equals(expected)) {
    throw new Error('Vendored catalog differs from scraper/data/curated/catalog.json; run pnpm catalog:sync.')
  }
} else {
  await writeFile(destination, expected)
}
