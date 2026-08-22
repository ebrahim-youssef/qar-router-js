import { resolveRecordingClass } from './class-resolver.js'
import type { Selection } from '../domain/selection.js'
import type { RecordingClassRef, SourceRef } from '../domain/refs.js'
export function resolveSelection(selection: Selection): { readonly recording: RecordingClassRef; readonly source?: SourceRef; readonly defaultsApplied: readonly ('riwayah' | 'style')[] } {
  if ('source' in selection && selection.source) return { recording: selection.source.recordingClass, source: selection.source, defaultsApplied: [] }
  if ('recording' in selection && selection.recording) return { recording: selection.recording, defaultsApplied: [] }
  return resolveRecordingClass({ reciter: typeof selection.reciter === 'string' ? selection.reciter : selection.reciter.id, ...(selection.riwayah ? { riwayah: selection.riwayah } : {}), ...(selection.style ? { style: selection.style } : {}) })
}
