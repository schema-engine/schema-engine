import type { StandardSchemaV1 } from '@standard-schema/spec';

/** Parses `value` with a registration schema and throws the joined issue messages when it does not pass. */
export function parseRegistration<TInput, TOutput>(schema: StandardSchemaV1<TInput, TOutput>, value: TInput): TOutput {
	const result = schema['~standard'].validate(value);
	if (result instanceof Promise) throw new Error('The registration schema validates asynchronously.');
	if (result.issues) throw new Error(result.issues.map((issue) => issue.message).join(', '));
	return result.value;
}
