import type { SourceRef } from '../../domain/refs.js'
import type { AudioSource } from '../../domain/result.js'
import { ProviderResponseError } from '../../domain/errors.js'
import { PROVIDER_CAPABILITIES } from '../../domain/capability.js'
import type { ProviderAdapter } from '../types.js'
export function everyAyahUrl(subfolder: string, surah: number, ayah: number): string { return `https://everyayah.com/data/${encodeURIComponent(subfolder)}/${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}.mp3` }
export function everyAyahSource(source: SourceRef, binding: Readonly<Record<string, unknown>>, surah: number, ayah: number): AudioSource {
  if (typeof binding.subfolder !== 'string') throw new ProviderResponseError('EveryAyah binding has no subfolder')
  return { granularity: 'ayah', representation: 'standalone', url: everyAyahUrl(binding.subfolder, surah, ayah), verseKey: `${surah}:${ayah}`, provider: 'everyAyah', sourceId: source.id, ...(typeof binding.bitrate === 'string' ? { bitrate: binding.bitrate } : {}) }
}
export const everyAyahAdapter = {
  provider: 'everyAyah',
  capabilities: PROVIDER_CAPABILITIES.everyAyah,
  async getAyahs(context) { return context.ayat.map(ayah => everyAyahSource(context.source, context.binding, context.surah, ayah)) },
} as const satisfies ProviderAdapter
