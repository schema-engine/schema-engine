import type * as z from 'zod/mini';

/**
 * Duck-type a Zod validator. Native Standard Schema objects only expose `~standard`.
 */
export function isZodType(schema: unknown): schema is z.ZodMiniType {
	return (
		typeof schema === 'object' &&
		schema !== null &&
		typeof (schema as { parse?: unknown }).parse === 'function' &&
		typeof (schema as { safeParse?: unknown }).safeParse === 'function'
	);
}
