import type { Capability } from '../domain/capability.js'
import type { ProviderTraceHook } from '../domain/trace.js'
import type { AudioSource } from '../domain/result.js'
import type { ProviderId, SourceRef } from '../domain/refs.js'
import type { AudioRouterConfig } from '../runtime/config.js'

export interface ProviderAdapterContext {
  readonly source: SourceRef
  readonly binding: Readonly<Record<string, unknown>>
  readonly surah: number
  readonly ayat?: readonly number[]
  readonly config: AudioRouterConfig
  readonly signal?: AbortSignal
  readonly timeoutMs?: number
  readonly onProviderTrace?: ProviderTraceHook
}

/** Provider boundary: adapters own provider wire formats, auth, pagination, and availability. */
export interface ProviderAdapter {
  readonly provider: ProviderId
  readonly capabilities: readonly Capability[]
  getAyahs?(context: ProviderAdapterContext & { readonly ayat: readonly number[] }): Promise<readonly AudioSource[]>
  getSurah?(context: ProviderAdapterContext): Promise<AudioSource> | AudioSource
  getAvailability?(source: SourceRef, context: Pick<ProviderAdapterContext, 'config' | 'signal' | 'timeoutMs'>): Promise<boolean>
}
