/**
 * Minimal logger contract for registry lifecycle events.
 */
export interface RegistryLogger {
	debug(message: string, data?: Record<string, unknown>): void;
	warn(message: string, data?: Record<string, unknown>): void;
}

/** Default no-op logger — registry works without any logging dependency. */
export const noopRegistryLogger: RegistryLogger = {
	debug() {},
	warn() {},
};

export interface BaseRegistryOptions {
	/** Optional logger for register/override/clear events. Defaults to no-op. */
	logger?: RegistryLogger;
}
