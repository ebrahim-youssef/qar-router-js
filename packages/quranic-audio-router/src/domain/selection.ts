import type { Representation } from './capability.js'
import type { ReciterId, ReciterRef, RecordingClassRef, RiwayahId, SourceRef, StyleId } from './refs.js'
export interface CommonOptions { readonly representation?: Representation; readonly alternatives?: 'none' | 'offline' | 'all'; readonly probe?: boolean; readonly signal?: AbortSignal; readonly timeoutMs?: number; readonly onProviderTrace?: import('./trace.js').ProviderTraceHook }
type LooseSelection = { readonly reciter: ReciterId | ReciterRef; readonly riwayah?: RiwayahId; readonly style?: StyleId; readonly source?: never; readonly recording?: never }
type RecordingSelection = { readonly recording: RecordingClassRef; readonly source?: never; readonly reciter?: never; readonly riwayah?: never; readonly style?: never }
type SourceSelection = { readonly source: SourceRef; readonly recording?: never; readonly reciter?: never; readonly riwayah?: never; readonly style?: never }
export type Selection = LooseSelection | RecordingSelection | SourceSelection
export type AyahRequest = { readonly ayah: string } & Selection & CommonOptions
export type AyahRangeRequest = { readonly from: string; readonly to: string } & Selection & CommonOptions
export type SurahRequest = { readonly surah: number } & Selection & CommonOptions
