import { ProviderResponseError, ResourceUnavailableError } from '../../domain/errors.js'
import type { SourceRef } from '../../domain/refs.js'
import type { AudioSource } from '../../domain/result.js'
import type { AudioRouterConfig } from '../../runtime/config.js'
import { getJson } from '../../runtime/http.js'
import { PROVIDER_CAPABILITIES } from '../../domain/capability.js'
import type { ProviderTraceHook } from '../../domain/trace.js'
import type { ProviderAdapter } from '../types.js'
export function mp3QuranSurahUrl(server: string, surah: number): string { return `${server.endsWith('/') ? server : `${server}/`}${String(surah).padStart(3, '0')}.mp3` }
type Timing = { readonly ayah: number; readonly start_time: number; readonly end_time: number }
function timings(payload: unknown): readonly Timing[] {
  const entries = Array.isArray(payload) ? payload : typeof payload === 'object' && payload !== null && Array.isArray((payload as { data?: unknown }).data) ? (payload as { data: unknown[] }).data : undefined
  if (!entries || entries.length === 0) throw new ProviderResponseError('MP3Quran timing response has no timing entries')
  let previousAyah = -1, previousStart = -1
  return entries.map(value => {
    if (typeof value !== 'object' || value === null) throw new ProviderResponseError('MP3Quran timing entry is not an object')
    const entry = value as Record<string, unknown>; const ayah = entry.ayah, start = entry.start_time, end = entry.end_time
    if (typeof ayah !== 'number' || !Number.isInteger(ayah) || typeof start !== 'number' || typeof end !== 'number' || ayah <= previousAyah || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || start < previousStart) throw new ProviderResponseError('Invalid MP3Quran timing sequence')
    if (previousAyah === -1 && ayah !== 0 && ayah !== 1) throw new ProviderResponseError('MP3Quran timing must begin at ayah 0 or 1')
    previousAyah = ayah; previousStart = start; return { ayah, start_time: start, end_time: end }
  })
}
export async function mp3QuranAyahSource(source: SourceRef, binding: Readonly<Record<string, unknown>>, surah: number, ayah: number, config: AudioRouterConfig, signal?: AbortSignal, timeoutMs?: number): Promise<AudioSource> {
  return (await mp3QuranAyahSources(source, binding, surah, [ayah], config, signal, timeoutMs))[0]!
}
export async function mp3QuranAyahSources(source: SourceRef, binding: Readonly<Record<string, unknown>>, surah: number, ayat: readonly number[], config: AudioRouterConfig, signal?: AbortSignal, timeoutMs?: number, onProviderTrace?: ProviderTraceHook): Promise<readonly AudioSource[]> {
  const moshafId = binding.moshafId, server = binding.server
  if (typeof moshafId !== 'number' || typeof server !== 'string') throw new ProviderResponseError('MP3Quran binding is malformed')
  const url = `https://www.mp3quran.net/api/v3/ayat_timing?surah=${surah}&read=${moshafId}`
  const started = Date.now()
  let payload: unknown
  try { payload = await getJson(url, config, signal, timeoutMs); onProviderTrace?.({ provider: 'mp3Quran', sourceId: source.id, request: { method: 'GET', origin: 'https://www.mp3quran.net', path: '/api/v3/ayat_timing' }, durationMs: Date.now() - started, response: payload }) } catch (error) { onProviderTrace?.({ provider: 'mp3Quran', sourceId: source.id, request: { method: 'GET', origin: 'https://www.mp3quran.net', path: '/api/v3/ayat_timing' }, durationMs: Date.now() - started, error }); throw error }
  const entries = timings(payload)
  return ayat.map(ayah => { const entry = entries.find(item => item.ayah === ayah); if (!entry) throw new ResourceUnavailableError(`MP3Quran source ${source.id} has no ayah ${surah}:${ayah}`); return { granularity: 'ayah' as const, representation: 'segment' as const, url: mp3QuranSurahUrl(server, surah), verseKey: `${surah}:${ayah}`, startMs: entry.start_time, endMs: entry.end_time, provider: 'mp3Quran' as const, sourceId: source.id } })
}
export function mp3QuranSurahSource(source: SourceRef, binding: Readonly<Record<string, unknown>>, surah: number): AudioSource { if (typeof binding.server !== 'string') throw new ProviderResponseError('MP3Quran binding has no server'); return { granularity: 'surah', representation: 'standalone', url: mp3QuranSurahUrl(binding.server, surah), surah, provider: 'mp3Quran', sourceId: source.id } }
export const mp3QuranAdapter = {
  provider: 'mp3Quran',
  capabilities: PROVIDER_CAPABILITIES.mp3Quran,
  getAyahs: async context => mp3QuranAyahSources(context.source, context.binding, context.surah, context.ayat, context.config, context.signal, context.timeoutMs, context.onProviderTrace),
  getSurah: context => mp3QuranSurahSource(context.source, context.binding, context.surah),
} as const satisfies ProviderAdapter
