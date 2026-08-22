import type { ProviderTraceHook } from '../domain/trace.js'
import type { ProviderId } from '../domain/refs.js'
export interface QuranFoundationConfig { readonly clientId: string; readonly clientSecret: string }
export interface AudioRouterConfig { readonly fetch?: typeof globalThis.fetch; readonly timeoutMs?: number; readonly retryCount?: number; readonly redirectCap?: number; readonly maxResponseBytes?: number; readonly providerPriority?: readonly ProviderId[]; readonly preferredBitrate?: number; readonly quranFoundation?: QuranFoundationConfig; readonly onProviderTrace?: ProviderTraceHook }
export const DEFAULT_TIMEOUT_MS = 10_000
export const DEFAULT_MAX_RESPONSE_BYTES = 1_000_000
