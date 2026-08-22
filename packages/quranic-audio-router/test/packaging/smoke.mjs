// Installs the packed tarball into a clean consumer outside the workspace.
// A workspace link resolves source and dev conditions; only a real install
// proves the published `exports` map, the .d.ts, and the CJS/ESM builds work.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const consumer = mkdtempSync(join(tmpdir(), 'qar-smoke-'))
let ok = false
try {
  execFileSync('npm', ['pack', '--pack-destination', consumer], { cwd: pkgDir, stdio: 'pipe' })
  const tgz = readdirSync(consumer).find(f => f.endsWith('.tgz'))
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }))
  execFileSync('npm', ['install', '--no-audit', '--no-fund', './' + tgz], { cwd: consumer, stdio: 'pipe' })

  writeFileSync(join(consumer, 'esm.mjs'), `
    import { getAyah, queryCatalog, Reciters } from 'quranic-audio-router'
    const q = queryCatalog()
    if (q.reciters.length !== 254) throw new Error('reciters: ' + q.reciters.length)
    if (q.classes.length !== 300) throw new Error('classes: ' + q.classes.length)
    const r = await getAyah({ ayah: '2:255', recording: Reciters.MahmoudAlhusary.Hafs.Murattal })
    const s = r.sources[0]
    if (s.representation !== 'standalone' || !s.url.endsWith('002255.mp3')) throw new Error('bad source: ' + JSON.stringify(s))
    if (r.resolved.source.provider !== 'everyAyah') throw new Error('bad provider')
    console.log('  esm ok ->', s.url)
  `)
  writeFileSync(join(consumer, 'cjs.cjs'), `
    const { queryCatalog } = require('quranic-audio-router')
    const n = queryCatalog().reciters.length
    if (n !== 254) throw new Error('cjs reciters: ' + n)
    console.log('  cjs ok ->', n, 'reciters')
  `)
  execFileSync('node', ['esm.mjs'], { cwd: consumer, stdio: 'inherit' })
  execFileSync('node', ['cjs.cjs'], { cwd: consumer, stdio: 'inherit' })
  ok = true
} finally {
  rmSync(consumer, { recursive: true, force: true })
}
console.log(ok ? 'Packaging smoke test passed.' : 'Packaging smoke test FAILED.')
