import { ProviderHttpError, ProviderResponseError } from '../domain/errors.js'
import type { AudioRouterConfig } from './config.js'
export async function getJson(url: string, config: AudioRouterConfig, signal?: AbortSignal, timeoutMs?: number): Promise<unknown> {
  const fetcher = config.fetch ?? globalThis.fetch
  if (!fetcher) throw new ProviderHttpError('No fetch implementation is available')
  const retries = config.retryCount ?? 1
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), timeoutMs ?? config.timeoutMs ?? 10_000)
    const abort = () => controller.abort(signal?.reason); signal?.addEventListener('abort', abort, { once: true })
    try {
      let requestUrl = url; let redirects = 0; let response: Response
      for (;;) {
        response = await fetcher(requestUrl, { method: 'GET', signal: controller.signal, redirect: 'manual' })
        if (response.status < 300 || response.status >= 400) break
        const location = response.headers.get('location')
        if (!location) throw new ProviderHttpError(`Redirect from ${new URL(requestUrl).origin}${new URL(requestUrl).pathname} has no Location header`, response.status)
        if (redirects++ >= (config.redirectCap ?? 3)) throw new ProviderHttpError(`GET exceeded redirect cap of ${config.redirectCap ?? 3}`, response.status)
        requestUrl = new URL(location, requestUrl).toString()
      }
      if (!response.ok) { if (response.status >= 500 && attempt < retries) { await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1))); continue }; throw new ProviderHttpError(`GET ${new URL(url).origin}${new URL(url).pathname} failed with ${response.status}`, response.status) }
      const length = Number(response.headers.get('content-length') ?? 0), ceiling = config.maxResponseBytes ?? 1_000_000
      if (length > ceiling) throw new ProviderResponseError(`Response exceeds ${ceiling} byte ceiling`)
      const text = await response.text(); if (new TextEncoder().encode(text).byteLength > ceiling) throw new ProviderResponseError(`Response exceeds ${ceiling} byte ceiling`)
      try { return JSON.parse(text) } catch (cause) { throw new ProviderResponseError('Provider returned invalid JSON', { cause }) }
    } catch (error) { if (attempt < retries && !(error instanceof ProviderHttpError) && !controller.signal.aborted) { await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1))); continue }; throw error } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
  }
}
