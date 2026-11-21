const RESERVED_PATH_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

/** The prefix the engine keeps for its own path segments, such as the form's own error key. */
export const ENGINE_KEY_PREFIX = '__';

/**
 * Whether a path segment is reserved: one that would reach an object's prototype, or one the engine keeps for itself.
 *
 * @remarks Every segment that starts with `__` is reserved, so a field can never collide with a key the engine adds, such as the form's own error key.
 */
export function isReservedPathKey(key: string): boolean {
	return RESERVED_PATH_KEYS.has(key) || key.startsWith(ENGINE_KEY_PREFIX);
}

/** @throws {Error} When `key` is a reserved path segment. */
export function assertWritablePathKey(key: string): void {
	if (isReservedPathKey(key)) {
		throw new Error(`Rejected path segment '${key}'`);
	}
}
