export class MemoryCache<T> {
  #entries = new Map<string, { value: T | undefined; error: unknown; expires: number; inFlight: Promise<T> | undefined }>()
  constructor(private readonly ttlMs = 60_000, private readonly negativeTtlMs = 5_000) {}
  async get(key: string, load: () => Promise<T>, isNegative: (value: T) => boolean = value => value === false || value === undefined): Promise<T> {
    const now = Date.now(); const existing = this.#entries.get(key)
    if (existing && existing.expires > now) { if (existing.inFlight) return existing.inFlight; if (existing.error !== undefined) throw existing.error; return existing.value as T }
    const entry: { value: T | undefined; error: unknown; expires: number; inFlight: Promise<T> | undefined } = { value: undefined, error: undefined, expires: now + this.ttlMs, inFlight: undefined }
    entry.inFlight = load().then(value => { entry.value = value; entry.expires = Date.now() + (isNegative(value) ? this.negativeTtlMs : this.ttlMs); entry.inFlight = undefined; return value }, error => { this.#entries.delete(key); throw error })
    this.#entries.set(key, entry); return entry.inFlight
  }
  clear(): void { this.#entries.clear() }
}
