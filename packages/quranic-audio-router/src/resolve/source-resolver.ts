import { catalog } from '../generated/catalog.data.js'
import { SourceNotFoundError } from '../domain/errors.js'
import type { ProviderId, RecordingClassRef, SourceId, SourceRef } from '../domain/refs.js'
export interface SourceBinding { readonly source: SourceRef; readonly binding: Readonly<Record<string, unknown>> }
const bitrate = (value: unknown) => typeof value === 'string' ? Number.parseInt(value, 10) || 0 : 0
const coversSurah = (binding: Readonly<Record<string, unknown>>, surah: number | undefined) => surah === undefined || typeof binding.surahList !== 'string' || binding.surahList.split(',').some(value => Number(value) === surah)
function toRef(leaf: (typeof catalog)[number], source: (typeof catalog)[number]['sources'][number]): SourceRef {
  return { kind: 'source', id: source.id as SourceId, provider: source.provider as ProviderId, recordingClass: { kind: 'recordingClass', reciter: leaf.reciter as RecordingClassRef['reciter'], riwayah: leaf.riwayah as RecordingClassRef['riwayah'], style: leaf.style as RecordingClassRef['style'] } as RecordingClassRef, label: source.label }
}
export function sourcesFor(recording: RecordingClassRef, provider?: ProviderId, surah?: number): readonly SourceBinding[] {
  const leaf = catalog.find(item => item.reciter === recording.reciter && item.riwayah === recording.riwayah && item.style === recording.style)
  if (!leaf) return []
  return leaf.sources.filter(source => (!provider || source.provider === provider) && coversSurah(source.binding, surah)).map(source => ({ source: toRef(leaf, source), binding: source.binding }))
}
export function findSource(id: SourceId): SourceBinding {
  for (const leaf of catalog) { const source = leaf.sources.find(candidate => candidate.id === id); if (source) return { source: toRef(leaf, source), binding: source.binding } }
  throw new SourceNotFoundError(`Unknown source: ${id}`)
}
export function rankSources(sources: readonly SourceBinding[], provider: ProviderId, preferredBitrate?: number, surah?: number): readonly SourceBinding[] {
  const result = sources.filter(item => item.source.provider === provider && (provider !== 'mp3Quran' || coversSurah(item.binding, surah))).slice()
  result.sort((a, b) => {
    if (provider === 'everyAyah') {
      const aRate = bitrate(a.binding.bitrate), bRate = bitrate(b.binding.bitrate)
      const effective = (rate: number) => preferredBitrate === undefined || rate <= preferredBitrate ? rate : -rate
      return effective(bRate) - effective(aRate) || Number(a.binding.everyAyahId) - Number(b.binding.everyAyahId)
    }
    if (provider === 'mp3Quran') return Number(b.binding.surahTotal) - Number(a.binding.surahTotal) || Number(a.binding.moshafId) - Number(b.binding.moshafId)
    return Number(a.binding.id) - Number(b.binding.id)
  })
  return result
}
