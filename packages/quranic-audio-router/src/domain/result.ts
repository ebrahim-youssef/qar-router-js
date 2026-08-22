import type { ProviderId, ReciterRef, RecordingClassRef, SourceId, SourceRef } from './refs.js'
import type { Granularity, Representation } from './capability.js'
export type AudioSource =
  | { readonly granularity: 'ayah'; readonly representation: 'standalone'; readonly url: string; readonly verseKey: string; readonly provider: ProviderId; readonly sourceId: SourceId; readonly bitrate?: string; readonly format?: string }
  | { readonly granularity: 'ayah'; readonly representation: 'segment'; readonly url: string; readonly verseKey: string; readonly startMs: number; readonly endMs: number; readonly provider: ProviderId; readonly sourceId: SourceId }
  | { readonly granularity: 'surah'; readonly representation: 'standalone'; readonly url: string; readonly surah: number; readonly provider: ProviderId; readonly sourceId: SourceId; readonly format?: string }
export interface ProviderAttempt { readonly provider: ProviderId; readonly sourceId: SourceId; readonly status: 'used' | 'skipped' | 'failed'; readonly reason?: string; readonly error?: unknown }
export interface AudioRoute { readonly source: SourceRef; readonly sources: readonly AudioSource[] }
export interface AudioResult { readonly resolved: { readonly reciter: ReciterRef; readonly recordingClass: RecordingClassRef; readonly source: SourceRef; readonly defaultsApplied: readonly ('riwayah' | 'style' | 'source')[]; readonly pinnedSourceAbandoned?: SourceRef }; readonly selection: { readonly kind: 'ayah'; readonly verseKey: string } | { readonly kind: 'ayahRange'; readonly surah: number; readonly from: number; readonly to: number } | { readonly kind: 'surah'; readonly surah: number }; readonly sources: readonly AudioSource[]; readonly alternatives?: readonly AudioRoute[]; readonly attempts: readonly ProviderAttempt[] }
export type RequestedCapability = { readonly granularity: Granularity; readonly representation?: Representation }
