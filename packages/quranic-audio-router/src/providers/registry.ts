import type { ProviderId } from '../domain/refs.js'
import { everyAyahAdapter } from './everyayah/index.js'
import { mp3QuranAdapter } from './mp3quran/index.js'
import type { ProviderAdapter } from './types.js'

const browserAdapters = new Map<ProviderId, ProviderAdapter>([
  [everyAyahAdapter.provider, everyAyahAdapter],
  [mp3QuranAdapter.provider, mp3QuranAdapter],
])
export const getBrowserProviderAdapter = (provider: ProviderId): ProviderAdapter | undefined => browserAdapters.get(provider)
