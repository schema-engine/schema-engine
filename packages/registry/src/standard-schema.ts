import type { StandardSchemaV1 } from '@standard-schema/spec';

export type StandardSchemaIssue = StandardSchemaV1.Issue;

export type StandardSchemaSafeParseResult<T> =
	{ success: true; data: T } | { success: false; error: { issues: StandardSchemaIssue[] } };

/**
 * Validate `value` with a Standard Schema without throwing.
 *
 * @param schema - Standard Schema to run
 * @param value - Input to validate
 * @throws {Error} When the schema validates asynchronously or returns a malformed result
 *
 * @remarks
 * Only synchronous validation is supported, because the callers (registry lookups, form validation,
 * action parsing) need an immediate result.
 */
export function safeParseStandardSchema<TInput, TOutput>(
	schema: StandardSchemaV1<TInput, TOutput>,
	value: TInput,
): StandardSchemaSafeParseResult<TOutput> {
	const result = schema['~standard'].validate(value);
	if (result && typeof (result as Promise<unknown>).then === 'function') {
		throw new Error('Async Standard Schema validation is not supported in this context');
	}
	if (result === null || typeof result !== 'object') {
		throw new Error('Standard Schema validation returned an invalid result');
	}

	const syncResult = result as StandardSchemaV1.Result<TOutput>;

	if (syncResult.issues !== undefined) {
		return {
			success: false,
			error: {
				issues: [...syncResult.issues],
			},
		};
	}

	return { success: true, data: syncResult.value };
}
