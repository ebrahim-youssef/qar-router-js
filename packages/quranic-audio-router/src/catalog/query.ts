import { catalog } from '../generated/catalog.data.js'
import { PROVIDER_CAPABILITIES, type Capability, type Granularity, type Representation } from '../domain/capability.js'
import type { ProviderId, ReciterId, ReciterRef, RiwayahId, SourceId, StyleId } from '../domain/refs.js'

export interface RecordingClassSummary { readonly kind: 'recordingClass'; readonly reciter: ReciterId; readonly riwayah: RiwayahId; readonly style: StyleId; readonly name: { readonly ar: string; readonly en: string }; readonly capabilities: readonly Capability[] }
/**
 * A concrete provider binding behind a recording class.
 *
 * `providerMetadata` is the provider's own vocabulary for this recording, verbatim and read-only:
 * MP3Quran `moshafId`/`server`/`surahList`, EveryAyah `subfolder`/`bitrate`, Quran Foundation `id`.
 * It exists for transparency, debugging and documentation. Application logic should route on the
 * canonical fields instead; these keys are provider-shaped, unstable, and differ per provider.
 */
export interface SourceSummary { readonly kind: 'source'; readonly id: SourceId; readonly provider: ProviderId; readonly recordingClass: RecordingClassSummary; readonly label: string; readonly capabilities: readonly Capability[]; readonly providerMetadata: Readonly<Record<string, unknown>> }
export interface CatalogQuery { readonly reciter?: ReciterId | ReciterRef | readonly (ReciterId | ReciterRef)[]; readonly riwayah?: RiwayahId | readonly RiwayahId[]; readonly style?: StyleId | readonly StyleId[]; readonly provider?: ProviderId | readonly ProviderId[]; readonly capability?: { readonly granularity?: Granularity; readonly representation?: Representation }; readonly surah?: number }
export interface CatalogQueryResult { readonly classes: readonly RecordingClassSummary[]; readonly sources: readonly SourceSummary[]; readonly reciters: readonly ReciterRef[]; readonly riwayat: readonly RiwayahId[]; readonly styles: readonly StyleId[] }
function many<T>(value: T | readonly T[] | undefined): readonly T[] | undefined { if (value === undefined) return undefined; return Array.isArray(value) ? value as readonly T[] : [value as T] }
const ids = (value: CatalogQuery['reciter']): readonly ReciterId[] | undefined => many(value)?.map(entry => typeof entry === 'string' ? entry : entry.id)
const hasSurah = (binding: Readonly<Record<string, unknown>>, surah: number): boolean => typeof binding.surahList !== 'string' || binding.surahList.split(',').some(part => Number(part) === surah)
const satisfies = (capabilities: readonly Capability[], requested: CatalogQuery['capability']): boolean => !requested || capabilities.some(capability => (requested.granularity === undefined || capability.granularity === requested.granularity) && (requested.representation === undefined || capability.representation === requested.representation))
export function queryCatalog(query: CatalogQuery = {}): CatalogQueryResult {
  const reciter = ids(query.reciter), riwayah = many(query.riwayah), style = many(query.style), provider = many(query.provider)
  const classes: RecordingClassSummary[] = []
  const sources: SourceSummary[] = []
  for (const leaf of catalog) {
    if (reciter && !reciter.includes(leaf.reciter as ReciterId)) continue
    if (riwayah && !riwayah.includes(leaf.riwayah as RiwayahId)) continue
    if (style && !style.includes(leaf.style as StyleId)) continue
    const classCapabilities = [...new Map(leaf.sources.flatMap(source => PROVIDER_CAPABILITIES[source.provider as ProviderId]).map(capability => [`${capability.granularity}/${capability.representation}`, capability])).values()]
    const summary: RecordingClassSummary = { kind: 'recordingClass', reciter: leaf.reciter as ReciterId, riwayah: leaf.riwayah as RiwayahId, style: leaf.style as StyleId, name: leaf.name, capabilities: classCapabilities }
    const matchingSources = leaf.sources.filter(source => (!provider || provider.includes(source.provider as ProviderId)) && (!query.surah || hasSurah(source.binding, query.surah)) && satisfies(PROVIDER_CAPABILITIES[source.provider as ProviderId], query.capability))
    if (matchingSources.length > 0 && satisfies(classCapabilities, query.capability)) classes.push(summary)
    for (const source of matchingSources) sources.push({ kind: 'source', id: source.id as SourceId, provider: source.provider as ProviderId, recordingClass: summary, label: source.label, capabilities: PROVIDER_CAPABILITIES[source.provider as ProviderId], providerMetadata: source.binding })
  }
  const reciters = [...new Map(classes.map(item => [item.reciter, { kind: 'reciter' as const, id: item.reciter, name: item.name }])).values()].sort((a, b) => a.id.localeCompare(b.id))
  return { classes, sources, reciters, riwayat: [...new Set(classes.map(item => item.riwayah))].sort(), styles: [...new Set(classes.map(item => item.style))].sort() }
}
