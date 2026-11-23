import type { StandardSchemaV1 } from '@standard-schema/spec';
import { safeParseStandardSchema } from '@schema-engine/registry';

export { assertStandardSchema, safeParseStandardSchema } from '@schema-engine/registry';
export type { StandardSchemaIssue, StandardSchemaSafeParseResult } from '@schema-engine/registry';

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
