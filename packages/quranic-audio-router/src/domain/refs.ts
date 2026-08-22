import type { ProviderId, ReciterId, RiwayahId, SourceId, StyleId, ValidRecordingClassRef } from '../generated/ids.js'

export type { ProviderId, ReciterId, RiwayahId, SourceId, StyleId }
export interface ReciterRef { readonly kind: 'reciter'; readonly id: ReciterId; readonly name: { readonly ar: string; readonly en: string } }
export type RecordingClassRef = ValidRecordingClassRef
export interface SourceRef { readonly kind: 'source'; readonly id: SourceId; readonly provider: ProviderId; readonly recordingClass: RecordingClassRef; readonly label: string }
export type ReciterNode = ReciterRef & { readonly [namespace: string]: unknown }
export const isReciterRef = (value: unknown): value is ReciterRef => typeof value === 'object' && value !== null && (value as { kind?: unknown }).kind === 'reciter'
export const isRecordingClassRef = (value: unknown): value is RecordingClassRef => typeof value === 'object' && value !== null && (value as { kind?: unknown }).kind === 'recordingClass'
export const isSourceRef = (value: unknown): value is SourceRef => typeof value === 'object' && value !== null && (value as { kind?: unknown }).kind === 'source'
