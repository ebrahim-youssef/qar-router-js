import type { ProviderId, SourceId } from './refs.js'
export interface ProviderTraceEvent { readonly provider: ProviderId; readonly sourceId: SourceId; readonly request: { readonly method: string; readonly origin: string; readonly path: string }; readonly status?: number; readonly durationMs: number; readonly response?: unknown; readonly error?: unknown }
export type ProviderTraceHook = (event: ProviderTraceEvent) => void
