/**
 * Loosely typed JSON Schema object used at the package boundary.
 * The serializer layer intentionally stays permissive so callers can inspect
 * emitted schemas without depending on a full JSON Schema AST type model.
 */
export type JSONSchemaObject = Record<string, any>;

/**
 * JSON Schema targets supported by the current serializer layer.
 * This mirrors the Standard JSON Schema target model and keeps room for
 * future target strings without another breaking type change.
 */
export type JSONSchemaTarget = 'draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0' | ({} & string);

/**
 * Options passed to Standard JSON Schema input and output converters.
 */
export interface JSONSchemaOptions {
	target: JSONSchemaTarget;
	libraryOptions?: Record<string, unknown>;
}

/**
 * Minimal Standard JSON Schema v1 surface used by this workspace.
 * It intentionally models only the parts the engine needs to expose today.
 */
export interface StandardJSONSchemaV1<Input = unknown, Output = Input> {
	readonly '~standard': {
		readonly version: 1;
		readonly vendor: string;
		readonly types?: {
			readonly input: Input;
			readonly output: Output;
		};
		readonly jsonSchema: {
			readonly input: (options: JSONSchemaOptions) => JSONSchemaObject;
			readonly output: (options: JSONSchemaOptions) => JSONSchemaObject;
		};
	};
}

/**
 * Create a Standard JSON Schema wrapper for a schema generator.
 * This keeps Standard JSON Schema plumbing separate from form-specific code.
 */
export function createStandardJSONSchema(
	vendor: string,
	generateInputSchema: (options: JSONSchemaOptions) => JSONSchemaObject,
	generateOutputSchema: (options: JSONSchemaOptions) => JSONSchemaObject = generateInputSchema,
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
	generateInputSchema: (id: string, options: JSONSchemaOptions) => JSONSchemaObject | undefined,
	generateOutputSchema: (
		id: string,
		options: JSONSchemaOptions,
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
