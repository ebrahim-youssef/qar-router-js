import type { ProviderId } from './refs.js'
export type Granularity = 'ayah' | 'surah'
export type Representation = 'standalone' | 'segment'
export interface Capability { readonly granularity: Granularity; readonly representation: Representation; readonly conditional?: boolean }
export const PROVIDER_CAPABILITIES: Readonly<Record<ProviderId, readonly Capability[]>> = {
  everyAyah: [{ granularity: 'ayah', representation: 'standalone' }],
  mp3Quran: [{ granularity: 'surah', representation: 'standalone' }, { granularity: 'ayah', representation: 'segment', conditional: true }],
  quranFoundationAyah: [{ granularity: 'ayah', representation: 'standalone' }],
  quranFoundationSurah: [{ granularity: 'surah', representation: 'standalone' }, { granularity: 'ayah', representation: 'segment' }],
}
