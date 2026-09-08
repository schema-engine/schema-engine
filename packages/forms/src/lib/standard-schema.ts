import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { z } from 'zod';

export type StandardSchemaIssue = {
	message: string;
	path?: ReadonlyArray<PropertyKey>;
};

export type StandardSchemaSafeParseResult<T> =
	{ success: true; data: T } | { success: false; error: { issues: StandardSchemaIssue[] } };

/**
 * Bridge a Zod schema to `StandardSchemaV1` for registration contracts.
 *
 * Zod implements Standard Schema at runtime. TypeScript may not infer matching
 * input/output variance when fields use `.default()` — this helper documents that boundary.
 */
export function asStandardSchema<T>(schema: z.ZodType<T>): StandardSchemaV1<T> {
	return schema as StandardSchemaV1<T>;
}

function hasStandardSchemaShape(schema: unknown): schema is StandardSchemaV1 {
	if (schema === null || (typeof schema !== 'object' && typeof schema !== 'function')) {
		return false;
	}

	return typeof (schema as StandardSchemaV1)['~standard']?.validate === 'function';
}

/**
 * Require a registration schema to implement Standard Schema before registration.
 */
export function assertStandardSchema(schema: unknown, context = 'Registration schema'): StandardSchemaV1 {
	if (!hasStandardSchemaShape(schema)) {
		throw new Error(`${context} must implement Standard Schema (~standard.validate).`);
	}
	return schema;
}

/**
 * Validate `value` with a Standard Schema and return parsed data.
 *
 * @param schema - Any `StandardSchemaV1` implementation (for example, a Zod schema)
 * @param value - Input to validate
 * @returns Parsed output typed as `T`
 * @throws {Error} When validation fails or the schema returns async validation
 */
export function parseStandardSchema<T>(schema: StandardSchemaV1<T>, value: unknown): T {
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
export function safeParseStandardSchema<T>(
	schema: StandardSchemaV1<T>,
	value: unknown,
): StandardSchemaSafeParseResult<T> {
	const result = schema['~standard'].validate(value);
	if (result && typeof (result as Promise<unknown>).then === 'function') {
		throw new Error('Async Standard Schema validation is not supported in this context');
	}

	const syncResult = result as {
		value?: T;
		issues?: ReadonlyArray<{ message: string; path?: ReadonlyArray<PropertyKey> }>;
	};

	if (syncResult.issues?.length) {
		return {
			success: false,
			error: {
				issues: syncResult.issues.map((issue) => ({
					message: issue.message,
					path: issue.path,
				})),
			},
		};
	}

	return { success: true, data: syncResult.value as T };
}

/**
 * Validate a registration config object against its registration schema.
 *
 * @param schema - Schema from `BaseRegistration.schema`
 * @param config - Config object; callers typically set `$type` before validating
 * @returns Parsed config typed as `T`
 * @throws {Error} Joined issue messages when validation fails
 */
export function validateRegistrationConfig<T>(schema: StandardSchemaV1<T>, config: object): T {
	const result = safeParseStandardSchema(schema, config);
	if (!result.success) {
		throw new Error(result.error.issues.map((issue) => issue.message).join(', '));
	}
	return result.data;
}
