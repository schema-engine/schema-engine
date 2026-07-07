import type { StandardSchemaV1 } from '@standard-schema/spec';
import { z } from 'zod';

export type StandardSchemaIssue = {
	message: string;
	path?: ReadonlyArray<PropertyKey>;
};

export type StandardSchemaSafeParseResult<T> =
	| { success: true; data: T }
	| { success: false; error: { issues: StandardSchemaIssue[] } };

/**
 * Parse via Standard Schema validate. Throws on failure.
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
 * Safe parse via Standard Schema validate.
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
 * Temporary bridge: Zod 4 schemas implement Standard Schema but form-composer
 * still composes unions with Zod until w2-02 (discriminated Standard Schema composer).
 */
export function asZodTypeAny(schema: StandardSchemaV1): z.ZodTypeAny {
	return schema as z.ZodTypeAny;
}

/**
 * Validate a registration config against its Standard Schema.
 * @throws Error with joined issue messages on failure
 */
export function validateRegistrationConfig<T>(schema: StandardSchemaV1<T>, config: object): T {
	const result = safeParseStandardSchema(schema, config);
	if (!result.success) {
		throw new Error(result.error.issues.map((issue) => issue.message).join(', '));
	}
	return result.data;
}
