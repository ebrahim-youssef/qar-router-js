import { PROVIDER_CAPABILITIES, type Granularity, type Representation } from '../domain/capability.js'
import type { ProviderId } from '../domain/refs.js'
export function supports(provider: ProviderId, granularity: Granularity, representation?: Representation): boolean {
  return PROVIDER_CAPABILITIES[provider].some(capability => capability.granularity === granularity && (representation === undefined || capability.representation === representation))
}
export const costClass = (provider: ProviderId, granularity: Granularity, representation?: Representation): 'offline' | 'network' | 'network+auth' => provider === 'everyAyah' ? 'offline' : provider === 'mp3Quran' ? (granularity === 'surah' && (representation === undefined || representation === 'standalone') ? 'offline' : 'network') : 'network+auth'
