import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { findSource } from '../src/resolve/source-resolver.js'
import { mp3QuranAyahSources, mp3QuranSurahUrl } from '../src/providers/mp3quran/index.js'
import { ProviderResponseError, ResourceUnavailableError } from '../src/domain/errors.js'

const fixture = async (name: string) => JSON.parse(await readFile(new URL(`./fixtures/mp3quran/${name}`, import.meta.url), 'utf8')) as unknown
const responseFor = (payload: unknown): typeof fetch => async () => new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
describe('MP3Quran timing alignment', () => {
  it.each([['timing-s1-r4.json', 4, 1], ['timing-s1-r53.json', 53, 7], ['timing-s1-r112.json', 112, 7], ['timing-s1-r258.json', 258, 1]] as const)('matches the ayah field for %s', async (file, read, ayah) => {
    const binding = findSource(`mp3Quran:${read}` as never)
    const sources = await mp3QuranAyahSources(binding.source, binding.binding, 1, [ayah], { fetch: responseFor(await fixture(file)), retryCount: 0 })
    expect(sources[0]).toMatchObject({ provider: 'mp3Quran', verseKey: `1:${ayah}`, representation: 'segment' })
  })
  it('does not offset read 112 surah 9 and reports the missing ayah', async () => {
    const binding = findSource('mp3Quran:112' as never)
    await expect(mp3QuranAyahSources(binding.source, binding.binding, 9, [129], { fetch: responseFor(await fixture('timing-s9-r112.json')), retryCount: 0 })).rejects.toBeInstanceOf(ResourceUnavailableError)
  })
  it.each([
    { payload: [{ ayah: 0, start_time: 0, end_time: 10 }, { ayah: 1, start_time: 10, end_time: 20 }, { ayah: 1, start_time: 20, end_time: 30 }, { ayah: 1, start_time: 30, end_time: 40 }] },
    { payload: [{ ayah: 1, start_time: 0, end_time: 10 }, { ayah: 5, start_time: 10, end_time: 20 }, { ayah: 1, start_time: 20, end_time: 30 }] },
  ])('rejects duplicate and out-of-order ayah fields', async ({ payload }) => {
    const binding = findSource('mp3Quran:112' as never)
    await expect(mp3QuranAyahSources(binding.source, binding.binding, 1, [1], { fetch: responseFor(payload), retryCount: 0 })).rejects.toBeInstanceOf(ProviderResponseError)
  })
  it('accepts read 112 surah 2 with a lead-in and all real ayat', async () => {
    const binding = findSource('mp3Quran:112' as never)
    const sources = await mp3QuranAyahSources(binding.source, binding.binding, 2, [1, 286], { fetch: responseFor(await fixture('timing-s2-r112.json')), retryCount: 0 })
    expect(sources.map(source => source.granularity === 'ayah' ? source.verseKey : undefined)).toEqual(['2:1', '2:286'])
  })
  it('keeps MP3Quran surah URLs zero-padded', () => expect(mp3QuranSurahUrl('https://example.test/audio', 9)).toBe('https://example.test/audio/009.mp3'))
})
