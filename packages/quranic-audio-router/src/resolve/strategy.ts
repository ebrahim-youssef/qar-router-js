import { costClass, supports } from './capability-resolver.js'
import { rankSources, type SourceBinding } from './source-resolver.js'
import type { Granularity, Representation } from '../domain/capability.js'
import type { ProviderId, RecordingClassRef } from '../domain/refs.js'
export interface RoutingConfig { readonly providerPriority?: readonly ProviderId[]; readonly preferredBitrate?: number; readonly configuredProviders?: readonly ProviderId[] }
export function routeCandidates(recording: RecordingClassRef, sources: readonly SourceBinding[], request: { readonly granularity: Granularity; readonly representation?: Representation; readonly surah?: number }, config: RoutingConfig): readonly SourceBinding[] {
  const configured = config.configuredProviders ?? ['everyAyah', 'mp3Quran'] as const
  const eligible = sources.filter(item => configured.includes(item.source.provider) && supports(item.source.provider, request.granularity, request.representation))
  const providers = [...new Set(eligible.map(item => item.source.provider))]
  providers.sort((a, b) => {
    const ai = config.providerPriority?.indexOf(a) ?? -1, bi = config.providerPriority?.indexOf(b) ?? -1
    if (ai !== -1 || bi !== -1) return ai === -1 ? 1 : bi === -1 ? -1 : ai - bi
    const costRank = { offline: 0, network: 1, 'network+auth': 2 } as const
    return costRank[costClass(a, request.granularity, request.representation)] - costRank[costClass(b, request.granularity, request.representation)] || a.localeCompare(b)
  })
  return providers.flatMap(provider => rankSources(eligible, provider, config.preferredBitrate, request.surah))
}
