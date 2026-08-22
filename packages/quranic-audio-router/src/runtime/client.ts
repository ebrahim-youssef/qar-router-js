import { catalog } from '../generated/catalog.data.js'
import { getBrowserProviderAdapter } from '../providers/registry.js'
import { AllProvidersFailedError, BrowserCredentialError, InvalidRequestError, NoEligibleProviderError, RepresentationUnavailableError, ResourceUnavailableError } from '../domain/errors.js'
import type { AudioResult, AudioRoute, AudioSource, ProviderAttempt } from '../domain/result.js'
import type { AyahRangeRequest, AyahRequest, Selection, SurahRequest } from '../domain/selection.js'
import type { RecordingClassRef, SourceRef } from '../domain/refs.js'
import { supports } from '../resolve/capability-resolver.js'
import { costClass } from '../resolve/capability-resolver.js'
import { resolveSelection } from '../resolve/defaults.js'
import { findSource, sourcesFor, type SourceBinding } from '../resolve/source-resolver.js'
import { routeCandidates } from '../resolve/strategy.js'
import { parseVerseKey } from '../util/verse-key.js'
import { ayahCount } from '../util/surah-meta.js'
import { isBrowser } from './env.js'
import type { AudioRouterConfig } from './config.js'

export interface AudioRouter { getAyah(request: AyahRequest): Promise<AudioResult>; getAyahs(request: AyahRangeRequest): Promise<AudioResult>; getSurah(request: SurahRequest): Promise<AudioResult> }
function guard(selection: Selection): void { const count = Number('source' in selection && Boolean(selection.source)) + Number('recording' in selection && Boolean(selection.recording)) + Number('reciter' in selection && Boolean(selection.reciter)); if (count !== 1) throw new InvalidRequestError('Exactly one of source, recording, or reciter selection is required') }
function nameFor(recording: RecordingClassRef): { readonly ar: string; readonly en: string } { const item = catalog.find(leaf => leaf.reciter === recording.reciter && leaf.riwayah === recording.riwayah && leaf.style === recording.style); if (!item) throw new NoEligibleProviderError('Resolved class no longer exists in the catalog'); return item.name }
async function sourceFor(binding: SourceBinding, surah: number, ayat: readonly number[], config: AudioRouterConfig, request: Pick<AyahRequest, 'signal' | 'timeoutMs' | 'onProviderTrace'>): Promise<readonly AudioSource[]> {
  const adapter = getBrowserProviderAdapter(binding.source.provider)
  if (!adapter?.getAyahs) throw new NoEligibleProviderError(`Provider ${binding.source.provider} is unavailable in the browser-safe entry point`)
  return adapter.getAyahs({ source: binding.source, binding: binding.binding, surah, ayat, config, ...(request.signal ? { signal: request.signal } : {}), ...(request.timeoutMs ? { timeoutMs: request.timeoutMs } : {}), ...((request.onProviderTrace ?? config.onProviderTrace) ? { onProviderTrace: request.onProviderTrace ?? config.onProviderTrace } : {}) })
}
function ayahContext(selection: Selection, surah: number, representation: AyahRequest['representation'], config: AudioRouterConfig): { readonly recording: RecordingClassRef; readonly candidates: readonly SourceBinding[]; readonly defaults: readonly ('riwayah' | 'style' | 'source')[]; readonly pinned?: SourceRef } {
  guard(selection); const resolved = resolveSelection(selection); const all = sourcesFor(resolved.recording)
  const capability = { granularity: 'ayah' as const, surah, ...(representation ? { representation } : {}) }
  if (resolved.source && !sourcesFor(resolved.recording, resolved.source.provider, surah).some(item => item.source.id === resolved.source!.id)) throw new ResourceUnavailableError(`Source ${resolved.source.id} is unavailable for surah ${surah}`)
  const candidates = resolved.source ? [findSource(resolved.source.id), ...routeCandidates(resolved.recording, all.filter(item => item.source.id !== resolved.source!.id), capability, config)] : routeCandidates(resolved.recording, all, capability, config)
  if (candidates.length === 0) { if (representation) throw new RepresentationUnavailableError(); throw new NoEligibleProviderError() }
  return { recording: resolved.recording, candidates, defaults: [...resolved.defaultsApplied, ...(resolved.source ? [] : ['source' as const])], ...(resolved.source ? { pinned: resolved.source } : {}) }
}
function buildResult(recording: RecordingClassRef, source: SourceRef, defaults: readonly ('riwayah' | 'style' | 'source')[], sources: readonly AudioSource[], attempts: readonly ProviderAttempt[], selection: AudioResult['selection'], pinned?: SourceRef, alternatives?: readonly AudioRoute[]): AudioResult { return { resolved: { reciter: { kind: 'reciter', id: recording.reciter, name: nameFor(recording) }, recordingClass: recording, source, defaultsApplied: defaults, ...(pinned && pinned.id !== source.id ? { pinnedSourceAbandoned: pinned } : {}) }, selection, sources, attempts, ...(alternatives && alternatives.length ? { alternatives } : {}) } }
async function resolveAyahs(selection: Selection, surah: number, ayat: readonly number[], options: Pick<AyahRequest, 'representation' | 'alternatives' | 'signal' | 'timeoutMs' | 'onProviderTrace'>, config: AudioRouterConfig, resultSelection: AudioResult['selection']): Promise<AudioResult> {
  const context = ayahContext(selection, surah, options.representation, config), attempts: ProviderAttempt[] = [], alternatives: AudioRoute[] = []
  let chosen: { binding: SourceBinding; sources: readonly AudioSource[] } | undefined
  for (const binding of context.candidates) {
    if (chosen && options.alternatives !== 'all' && options.alternatives !== 'none' && costClass(binding.source.provider, 'ayah', options.representation) !== 'offline') break
    try {
      const sources = await sourceFor(binding, surah, ayat, config, options); attempts.push({ provider: binding.source.provider, sourceId: binding.source.id, status: 'used' })
      if (!chosen) chosen = { binding, sources }
      else if (options.alternatives === 'all' || (options.alternatives !== 'none' && binding.source.provider !== 'mp3Quran')) alternatives.push({ source: binding.source, sources })
      if (chosen && options.alternatives === 'none') break
    } catch (error) { attempts.push({ provider: binding.source.provider, sourceId: binding.source.id, status: 'failed', reason: error instanceof Error ? error.message : 'Provider failed', error }) }
  }
  if (!chosen) throw new AllProvidersFailedError(attempts)
  return buildResult(context.recording, chosen.binding.source, context.defaults, chosen.sources, attempts, resultSelection, context.pinned, alternatives)
}
export function createAudioRouter(config: AudioRouterConfig = {}): AudioRouter {
  if (config.quranFoundation && isBrowser()) throw new BrowserCredentialError('Quran Foundation client credentials cannot be supplied in a browser')
  return {
    async getAyah(request) { const verse = parseVerseKey(request.ayah); return resolveAyahs(request, verse.surah, [verse.ayah], request, config, { kind: 'ayah', verseKey: request.ayah }) },
    async getAyahs(request) { const from = parseVerseKey(request.from), to = parseVerseKey(request.to); if (from.surah !== to.surah) throw new InvalidRequestError('Cross-surah ranges are unsupported; partition the range into one request per surah'); if (from.ayah > to.ayah) throw new InvalidRequestError('Range start must not be after range end'); const ayat = Array.from({ length: to.ayah - from.ayah + 1 }, (_, index) => from.ayah + index); return resolveAyahs(request, from.surah, ayat, request, config, { kind: 'ayahRange', surah: from.surah, from: from.ayah, to: to.ayah }) },
    async getSurah(request) {
      ayahCount(request.surah); guard(request); const resolved = resolveSelection(request); const all = sourcesFor(resolved.recording); const capability = { granularity: 'surah' as const, surah: request.surah, ...(request.representation ? { representation: request.representation } : {}) }; if (resolved.source && !sourcesFor(resolved.recording, resolved.source.provider, request.surah).some(item => item.source.id === resolved.source!.id)) throw new ResourceUnavailableError(`Source ${resolved.source.id} is unavailable for surah ${request.surah}`); const candidates = resolved.source ? [findSource(resolved.source.id), ...routeCandidates(resolved.recording, all.filter(item => item.source.id !== resolved.source!.id), capability, config)] : routeCandidates(resolved.recording, all, capability, config)
      if (candidates.length === 0 || candidates.every(candidate => !supports(candidate.source.provider, 'surah', request.representation))) { if (request.representation) throw new RepresentationUnavailableError(); throw new NoEligibleProviderError() }
      const attempts: ProviderAttempt[] = []
      for (const candidate of candidates) {
        if (!supports(candidate.source.provider, 'surah', request.representation)) { attempts.push({ provider: candidate.source.provider, sourceId: candidate.source.id, status: 'skipped', reason: 'capability mismatch' }); continue }
        try { const adapter = getBrowserProviderAdapter(candidate.source.provider); if (!adapter?.getSurah) throw new NoEligibleProviderError(`Provider ${candidate.source.provider} is unavailable in the browser-safe entry point`); const audio = await adapter.getSurah({ source: candidate.source, binding: candidate.binding, surah: request.surah, config, ...(request.signal ? { signal: request.signal } : {}), ...(request.timeoutMs ? { timeoutMs: request.timeoutMs } : {}), ...((request.onProviderTrace ?? config.onProviderTrace) ? { onProviderTrace: request.onProviderTrace ?? config.onProviderTrace } : {}) }); attempts.push({ provider: candidate.source.provider, sourceId: candidate.source.id, status: 'used' }); return buildResult(resolved.recording, candidate.source, [...resolved.defaultsApplied, ...(resolved.source ? [] : ['source' as const])], [audio], attempts, { kind: 'surah', surah: request.surah }, resolved.source) } catch (error) { attempts.push({ provider: candidate.source.provider, sourceId: candidate.source.id, status: 'failed', error }) }
      }
      throw new AllProvidersFailedError(attempts)
    },
  }
}
let defaultClient: AudioRouter | undefined
const defaultRouter = () => defaultClient ??= createAudioRouter()
export const getAyah = (request: AyahRequest) => defaultRouter().getAyah(request)
export const getAyahs = (request: AyahRangeRequest) => defaultRouter().getAyahs(request)
export const getSurah = (request: SurahRequest) => defaultRouter().getSurah(request)
export const resetDefaultClient = (): void => { defaultClient = undefined }
