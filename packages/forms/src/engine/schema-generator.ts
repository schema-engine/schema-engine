import { z } from 'zod';
import type { FormEngineSchemaMetadata } from '@/engine/form-engine';

/**
 * Options for JSON Schema generation
 */
export interface JSONSchemaOptions {
	/** JSON Schema version to target */
	target?: 'draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0';
	/** Custom URI generator for schema references */
	uriGenerator?: (id: string) => string;
}

/**
 * Options for form configuration schema generation
 */
export interface FormConfigSchemaOptions extends JSONSchemaOptions {
	/** Allow additional properties in form config */
	additionalProperties?: boolean;
}

/**
 * Service responsible for generating JSON schemas from Zod schemas.
 *
 * Handles form configuration schema generation with nested and recursive
 * schema relationships via Zod's registry system.
 *
 * @internal This is primarily used by FormEngine. Most users should use
 * FormEngine.generateFormConfigSchema() instead.
 */
export class SchemaGenerator {
	/**
	 * Generate JSON schema for form configuration objects.
	 *
	 * This method generates schemas that describe the structure of
	 * form configuration objects passed to the renderer.
	 *
	 * Handles:
	 * - Dynamic schema generation from registered components
	 * - Nested and recursive schema relationships (via Zod registry)
	 * - Optional properties and metadata
	 *
	 * @param formConfigSchema - Zod schema for the form configuration
	 * @param schemaRegistry - Registry containing all component schemas
	 * @param options - Schema generation options
	 * @returns JSON Schema for form configuration
	 */
	generateFormConfigSchema(
		formConfigSchema: z.ZodObject<any>,
		schemaRegistry: ReturnType<typeof z.registry<FormEngineSchemaMetadata>>,
		options?: FormConfigSchemaOptions,
	): any {
		const target = options?.target || 'draft-2020-12';

		const schema = z.toJSONSchema(formConfigSchema, {
			target,
			metadata: schemaRegistry,
		}) as any;

		schema.$id = 'form-config-schema';

		if (options?.additionalProperties !== undefined) {
			schema.additionalProperties = options.additionalProperties;
		}

		if (
			schema.properties?.metadata &&
			typeof schema.properties.metadata.additionalProperties === 'object' &&
			Object.keys(schema.properties.metadata.additionalProperties).length === 0
		) {
			schema.properties.metadata.additionalProperties = true;
		}

		return schema;
	}
}
