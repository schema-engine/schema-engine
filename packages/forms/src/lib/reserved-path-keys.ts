const RESERVED_PATH_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

/** Whether a path segment would reach an object's prototype. */
export function isReservedPathKey(key: string): boolean {
	return RESERVED_PATH_KEYS.has(key);
}

/** @throws {Error} When `key` is a reserved path segment. */
export function assertWritablePathKey(key: string): void {
	if (isReservedPathKey(key)) {
		throw new Error(`Rejected path segment '${key}'`);
	}
}
