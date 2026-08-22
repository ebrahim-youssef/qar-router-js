// Asserts the published tarball contains exactly what it should and nothing else.
// The `files` allowlist is not self-enforcing: prepack scripts, sourcemaps and
// bundledDependencies can all put unintended files in a tarball.
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: pkgDir, encoding: 'utf8' })
const files = JSON.parse(raw)[0].files.map(f => f.path).sort()

const allowed = [/^dist\//, /^package\.json$/, /^README\.md$/, /^LICENSE$/]
const forbidden = [
  [/playground/i, 'playground app source'],
  [/^data\//, 'the raw catalog (it is compiled into dist)'],
  [/fixtures?\//i, 'test fixtures'],
  [/\.map$/, 'sourcemaps (they embed workspace paths via sourcesContent)'],
  [/node_modules/, 'node_modules'],
  [/^src\//, 'raw source'],
  [/^scripts\//, 'build scripts'],
]

const problems = []
for (const file of files) {
  if (!allowed.some(rx => rx.test(file))) problems.push(`unexpected file: ${file}`)
  for (const [rx, why] of forbidden) {
    if (rx.test(file)) problems.push(`must not ship ${why}: ${file}`)
  }
}
for (const required of ['package.json', 'README.md', 'LICENSE']) {
  if (!files.includes(required)) problems.push(`missing required file: ${required}`)
}
if (!files.some(f => f === 'dist/index.js')) problems.push('missing dist/index.js')
if (!files.some(f => f === 'dist/index.d.ts')) problems.push('missing dist/index.d.ts')

if (problems.length) {
  console.error('Tarball assertion failed:\n' + problems.map(p => '  - ' + p).join('\n'))
  console.error('\nFull file list:\n' + files.map(f => '  ' + f).join('\n'))
  process.exit(1)
}
console.log(`Tarball OK: ${files.length} files, no forbidden paths.`)
