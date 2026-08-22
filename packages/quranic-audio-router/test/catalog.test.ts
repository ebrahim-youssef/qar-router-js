import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { resolveRecordingClass } from '../src/resolve/class-resolver.js'
import { createAudioRouter, getAyah, getAyahs, getSurah, queryCatalog, Reciters } from '../src/index.js'
import { InvalidRequestError, RepresentationUnavailableError, ResourceUnavailableError } from '../src/domain/errors.js'
import { findSource, rankSources, sourcesFor } from '../src/resolve/source-resolver.js'
import { formatVerseKey, parseVerseKey } from '../src/util/verse-key.js'
import { ayahCount } from '../src/util/surah-meta.js'

describe('catalog and core routing', () => {
  it('uses the public 300-leaf projection and returns facets from filtered leaves', () => {
    const all = queryCatalog(); expect(all.classes).toHaveLength(300); expect(all.reciters).toHaveLength(254)
    const filtered = queryCatalog({ reciter: Reciters.MahmoudAlhusary })
    expect(filtered.classes.length).toBeGreaterThan(1)
    expect(filtered.classes.every(item => item.reciter === 'mahmoud_alhusary')).toBe(true)
    expect(filtered.riwayat).toContain('hafs')
  })
  it('resolves defaults over actual leaves rather than independent enums', () => {
    const resolved = resolveRecordingClass({ reciter: 'mahmoud_alhusary' })
    expect(resolved.recording).toMatchObject({ riwayah: 'hafs', style: 'murattal' })
    expect(resolved.defaultsApplied).toEqual(['riwayah', 'style'])
  })
  it('constructs credential-free ayah and surah routes', async () => {
    const ayah = await getAyah({ ayah: '1:2', recording: Reciters.MahmoudAlhusary.Hafs.Murattal })
    expect(ayah.sources[0]).toMatchObject({ granularity: 'ayah', representation: 'standalone', provider: 'everyAyah', verseKey: '1:2' })
    const surah = await getSurah({ surah: 1, recording: Reciters.MahmoudAlhusary.Hafs.Murattal })
    expect(surah.sources[0]).toMatchObject({ granularity: 'surah', representation: 'standalone', provider: 'mp3Quran' })
  })
  it('rejects cross-surah ranges', async () => {
    await expect(getAyahs({ from: '1:7', to: '2:1', reciter: 'mahmoud_alhusary' })).rejects.toBeInstanceOf(InvalidRequestError)
  })
  it('lets explicit provider priority override the offline cost heuristic', async () => {
    const router = createAudioRouter({ providerPriority: ['mp3Quran'], fetch: async () => new Response(JSON.stringify([{ ayah: 1, start_time: 0, end_time: 100 }, { ayah: 2, start_time: 100, end_time: 200 }]), { status: 200 }), retryCount: 0 })
    const result = await router.getAyah({ ayah: '1:2', recording: Reciters.MahmoudAlhusary.Hafs.Murattal })
    expect(result.sources[0]).toMatchObject({ provider: 'mp3Quran', representation: 'segment' })
  })
  it('returns offline primary routes by default and all provider representations only when requested', async () => {
    let calls = 0
    const fetch = async () => { calls++; return new Response(JSON.stringify([{ ayah: 1, start_time: 0, end_time: 100 }, { ayah: 2, start_time: 100, end_time: 200 }]), { status: 200 }) }
    const router = createAudioRouter({ fetch, retryCount: 0 })
    const offline = await router.getAyah({ ayah: '1:2', reciter: 'mahmoud_alhusary' })
    expect(offline.sources).toHaveLength(1)
    expect(offline.sources[0]).toMatchObject({ provider: 'everyAyah', representation: 'standalone' })
    expect(calls).toBe(0)
    const all = await router.getAyah({ ayah: '1:2', reciter: 'mahmoud_alhusary', alternatives: 'all' })
    expect(calls).toBe(1)
    expect(all.sources[0]).toMatchObject({ representation: 'standalone' })
    expect(all.alternatives?.some(route => route.sources.some(source => source.granularity === 'ayah' && source.representation === 'segment'))).toBe(true)
  })
  it('pins segment resolution and rejects unavailable representations', async () => {
    const router = createAudioRouter({ fetch: async () => new Response(JSON.stringify([{ ayah: 1, start_time: 0, end_time: 100 }, { ayah: 2, start_time: 100, end_time: 200 }]), { status: 200 }), retryCount: 0 })
    const segment = await router.getAyah({ ayah: '1:2', reciter: 'mahmoud_alhusary', representation: 'segment' })
    expect(segment.sources[0]).toMatchObject({ provider: 'mp3Quran', representation: 'segment' })
    const everyOnly = queryCatalog({ provider: 'everyAyah' }).classes.find(recording => queryCatalog({ reciter: recording.reciter, riwayah: recording.riwayah, style: recording.style }).sources.every(source => source.provider === 'everyAyah'))
    expect(everyOnly).toBeDefined()
    await expect(router.getAyah({ ayah: '1:2', recording: { kind: 'recordingClass', reciter: everyOnly!.reciter, riwayah: everyOnly!.riwayah, style: everyOnly!.style } as never, representation: 'segment' })).rejects.toBeInstanceOf(RepresentationUnavailableError)
  })
  it('pins every source-ranking tiebreak and static MP3Quran availability filter', async () => {
    const ajmi = resolveRecordingClass({ reciter: 'ahmad_alajmi', riwayah: 'hafs', style: 'murattal' }).recording
    const rankedAjmi = rankSources(sourcesFor(ajmi), 'everyAyah')
    expect(rankedAjmi[0]?.binding.everyAyahId).toBe('13')
    const minshawi = resolveRecordingClass({ reciter: 'muhammad_alminshawi', riwayah: 'hafs', style: 'murattal' }).recording
    const router = createAudioRouter()
    const available = await router.getSurah({ surah: 55, recording: minshawi })
    expect(available.resolved.source.id).toBe('mp3Quran:112')
    await expect(router.getSurah({ surah: 55, source: findSource('mp3Quran:10924' as never).source })).rejects.toBeInstanceOf(ResourceUnavailableError)
  })
  it('preserves one MP3Quran segment per ayah in a range', async () => {
    const router = createAudioRouter({ providerPriority: ['mp3Quran'], fetch: async () => new Response(JSON.stringify([{ ayah: 1, start_time: 0, end_time: 100 }, { ayah: 2, start_time: 100, end_time: 200 }, { ayah: 3, start_time: 200, end_time: 300 }]), { status: 200 }), retryCount: 0 })
    const range = await router.getAyahs({ from: '1:1', to: '1:3', reciter: 'mahmoud_alhusary' })
    expect(range.sources).toHaveLength(3)
    expect(range.sources.every(source => source.granularity === 'ayah' && source.representation === 'segment')).toBe(true)
  })
  it('exposes provider-native vocabulary for transparency without requiring it for routing', () => {
    const husary = queryCatalog({ reciter: 'mahmoud_alhusary', riwayah: 'hafs', style: 'murattal' }).sources
    const mp3 = husary.find(source => source.provider === 'mp3Quran')
    const every = husary.filter(source => source.provider === 'everyAyah')
    expect(mp3?.providerMetadata).toMatchObject({ moshafId: 118, server: 'https://server13.mp3quran.net/husr/' })
    expect(every.map(source => source.providerMetadata.subfolder).sort()).toEqual(['Husary_128kbps', 'Husary_64kbps'])
    const qfa = husary.find(source => source.provider === 'quranFoundationAyah')
    const qfs = husary.find(source => source.provider === 'quranFoundationSurah')
    expect(qfa?.providerMetadata.id).toBe(6)
    expect(qfs?.providerMetadata.id).toBe(6)
  })
  it('round-trips every valid verse key', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 114 }).chain(surah => fc.integer({ min: 1, max: ayahCount(surah) }).map(ayah => ({ surah, ayah }))), verse => { expect(parseVerseKey(formatVerseKey(verse))).toEqual(verse); return true }))
  })
})
