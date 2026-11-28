import type { StandardJSONSchemaV1 } from '@standard-schema/spec';
export type { StandardJSONSchemaV1 } from '@standard-schema/spec';

/**
 * Loosely typed JSON Schema object used at the package boundary.
 * The serializer layer intentionally stays permissive so callers can inspect
 * emitted schemas without depending on a full JSON Schema AST type model.
 * @remarks Values are existential JSON Schema nodes; callers inspecting nested
 * vendor-specific keywords retain the permissive boundary used by the engine.
 */
export type JSONSchemaObject = Record<string, any>;

/**
 * Create a Standard JSON Schema wrapper for a schema generator.
 * This keeps Standard JSON Schema plumbing separate from form-specific code.
 */
export function createStandardJSONSchema(
	vendor: string,
	generateInputSchema: (options: StandardJSONSchemaV1.Options) => JSONSchemaObject,
	generateOutputSchema: (options: StandardJSONSchemaV1.Options) => JSONSchemaObject = generateInputSchema,
): StandardJSONSchemaV1 {
	return {
		'~standard': {
			version: 1,
			vendor,
			jsonSchema: {
				input: generateInputSchema,
				output: generateOutputSchema,
			},
		},
	};
}

/**
 * Create a record of Standard JSON Schema wrappers from stable schema ids.
 * This is used when a package wants to expose many related schemas through the
 * same vendor-specific serializer without duplicating wrapper logic.
 */
export function createStandardJSONSchemaRecord(
	ids: string[],
	vendor: string,
	generateInputSchema: (id: string, options: StandardJSONSchemaV1.Options) => JSONSchemaObject | undefined,
	generateOutputSchema: (
		id: string,
		options: StandardJSONSchemaV1.Options,
	) => JSONSchemaObject | undefined = generateInputSchema,
): Record<string, StandardJSONSchemaV1> {
	return Object.fromEntries(
		ids.map((id) => [
			id,
			createStandardJSONSchema(
				vendor,
				(options) => {
					const schema = generateInputSchema(id, options);
					if (!schema) {
						throw new Error(`Schema "${id}" is not registered`);
					}
					return schema;
				},
				(options) => {
					const schema = generateOutputSchema(id, options);
					if (!schema) {
						throw new Error(`Schema "${id}" is not registered`);
					}
					return schema;
				},
			),
		]),
	) as Record<string, StandardJSONSchemaV1>;
}
