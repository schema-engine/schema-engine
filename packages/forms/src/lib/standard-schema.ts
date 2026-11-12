import type { StandardSchemaV1 } from '@standard-schema/spec';

export type StandardSchemaIssue = StandardSchemaV1.Issue;

export type StandardSchemaSafeParseResult<T> =
	{ success: true; data: T } | { success: false; error: { issues: StandardSchemaIssue[] } };

export { assertStandardSchema } from '@schema-engine/registry';

/**
 * Validate `value` with a Standard Schema and return parsed data.
 *
 * @param schema - Any `StandardSchemaV1` implementation (for example, a Zod Mini, Valibot, or Effect Schema schema)
 * @param value - Input to validate
 * @returns Parsed output typed as `T`
 * @throws {Error} When validation fails or the schema returns async validation
 */
export function parseStandardSchema<TInput, TOutput>(
	schema: StandardSchemaV1<TInput, TOutput>,
	value: TInput,
): TOutput {
	const result = safeParseStandardSchema(schema, value);
	if (!result.success) {
		const message = result.error.issues[0]?.message ?? 'Validation failed';
		throw new Error(message);
	}
	return result.data;
}

/**
 * Validate `value` with a Standard Schema without throwing.
 *
 * Only synchronous validation is supported. Async schemas throw because builder
 * and registry code paths require immediate results.
 *
 * @param schema - Standard Schema to run
 * @param value - Input to validate
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

/**
 * Validate a registration config object against its registration schema.
 *
 * @param schema - Schema from `BaseRegistration.schema`
 * @param config - Config object; callers typically set `$type` before validating
 * @returns Parsed config typed as `T`
 * @throws {Error} Joined issue messages when validation fails
 */
export function validateRegistrationConfig<TInput, TOutput>(
	schema: StandardSchemaV1<TInput, TOutput>,
	config: TInput,
): TOutput {
	const result = safeParseStandardSchema(schema, config);
	if (!result.success) {
		throw new Error(result.error.issues.map((issue) => issue.message).join(', '));
	}
	return result.data;
}
