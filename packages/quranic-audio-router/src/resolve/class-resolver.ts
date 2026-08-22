import { catalog } from '../generated/catalog.data.js'
import { RIWAYAH_PRIORITY, STYLE_PRIORITY } from '../generated/priority.js'
import { RecordingClassNotFoundError, ReciterNotFoundError } from '../domain/errors.js'
import type { ReciterId, RiwayahId, StyleId, RecordingClassRef } from '../domain/refs.js'
const rank = <T>(values: readonly T[], value: T) => { const index = values.indexOf(value); return index === -1 ? Number.MAX_SAFE_INTEGER : index }
export interface ClassSelection { readonly reciter: ReciterId; readonly riwayah?: RiwayahId; readonly style?: StyleId }
export function resolveRecordingClass(selection: ClassSelection): { readonly recording: RecordingClassRef; readonly defaultsApplied: readonly ('riwayah' | 'style')[] } {
  const forReciter = catalog.filter(leaf => leaf.reciter === selection.reciter)
  if (forReciter.length === 0) throw new ReciterNotFoundError(`Unknown reciter: ${selection.reciter}`)
  const candidates = forReciter.filter(leaf => (selection.riwayah === undefined || leaf.riwayah === selection.riwayah) && (selection.style === undefined || leaf.style === selection.style)).sort((a, b) => rank(RIWAYAH_PRIORITY, a.riwayah as never) - rank(RIWAYAH_PRIORITY, b.riwayah as never) || rank(STYLE_PRIORITY, a.style as never) - rank(STYLE_PRIORITY, b.style as never) || a.reciter.localeCompare(b.reciter))
  const selected = candidates[0]
  if (!selected) throw new RecordingClassNotFoundError(`No matching recording class for ${selection.reciter}`)
  const defaultsApplied: ('riwayah' | 'style')[] = []
  if (selection.riwayah === undefined) defaultsApplied.push('riwayah')
  if (selection.style === undefined) defaultsApplied.push('style')
  return { recording: { kind: 'recordingClass', reciter: selected.reciter as ReciterId, riwayah: selected.riwayah as RiwayahId, style: selected.style as StyleId } as RecordingClassRef, defaultsApplied }
}
