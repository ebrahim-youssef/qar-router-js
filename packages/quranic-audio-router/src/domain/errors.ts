import type { ProviderAttempt } from './result.js'
export class RqaError extends Error { readonly code: string; constructor(code: string, message: string, options?: ErrorOptions) { super(message, options); this.name = new.target.name; this.code = code } }
export class RecordingClassNotFoundError extends RqaError { constructor(message = 'Recording class was not found') { super('RECORDING_CLASS_NOT_FOUND', message) } }
export class SourceNotFoundError extends RqaError { constructor(message = 'Source was not found') { super('SOURCE_NOT_FOUND', message) } }
export class ReciterNotFoundError extends RqaError { constructor(message = 'Reciter was not found') { super('RECITER_NOT_FOUND', message) } }
export class InvalidRequestError extends RqaError { constructor(message: string) { super('INVALID_REQUEST', message) } }
export class RepresentationUnavailableError extends RqaError { constructor(message = 'Requested representation is unavailable') { super('REPRESENTATION_UNAVAILABLE', message) } }
export class ResourceUnavailableError extends RqaError { constructor(message = 'Requested resource is unavailable') { super('RESOURCE_UNAVAILABLE', message) } }
export class NoEligibleProviderError extends RqaError { constructor(message = 'No eligible provider') { super('NO_ELIGIBLE_PROVIDER', message) } }
export class ProviderNotConfiguredError extends RqaError { constructor(message = 'Provider is not configured') { super('PROVIDER_NOT_CONFIGURED', message) } }
export class BrowserCredentialError extends RqaError { constructor(message = 'Credentials cannot be used in a browser') { super('BROWSER_CREDENTIAL', message) } }
export class AllProvidersFailedError extends RqaError { readonly attempts: readonly ProviderAttempt[]; constructor(attempts: readonly ProviderAttempt[]) { super('ALL_PROVIDERS_FAILED', 'All eligible providers failed'); this.attempts = attempts } }
export class ProviderHttpError extends RqaError { constructor(message: string, readonly status?: number, options?: ErrorOptions) { super('PROVIDER_HTTP', message, options) } }
export class ProviderResponseError extends RqaError { constructor(message: string, options?: ErrorOptions) { super('PROVIDER_RESPONSE', message, options) } }
