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
 * Handles:
 * - Component schema generation with proper $refs
 * - Form configuration schema generation
 * - Nested and recursive schema relationships
 * - Schema normalization (anyOf -> oneOf)
 * - Custom URI generation for schema references
 *
 * @example
 * ```typescript
 * const generator = new SchemaGenerator();
 *
 * // Generate component schemas
 * const componentSchemas = generator.generateComponentSchemas(
 *   schemaRegistry,
 *   { target: 'draft-2020-12' }
 * );
 *
 * // Generate form config schema
 * const configSchema = generator.generateFormConfigSchema(
 *   formConfigSchema,
 *   schemaRegistry,
 *   { additionalProperties: false }
 * );
 * ```
 */
export class SchemaGenerator {
	/**
	 * Generate JSON schemas for all registered components.
	 *
	 * This method creates individual schemas for each component type,
	 * properly handling nested schemas and $ref relationships.
	 *
	 * @param schemaRegistry - Zod registry containing all component schemas
	 * @param options - Schema generation options
	 * @returns Object with individual component schemas
	 */
	generateComponentSchemas(
		schemaRegistry: ReturnType<typeof z.registry<FormEngineSchemaMetadata>>,
		options?: JSONSchemaOptions,
	): {
		schemas: Record<string, any>;
	} {
		const target = options?.target || 'draft-2020-12';

		return z.toJSONSchema(schemaRegistry, {
			target,
			...(options?.uriGenerator && { uri: options.uriGenerator }),
		}) as { schemas: Record<string, any> };
	}

	/**
	 * Generate a unified JSON schema with all components in $defs.
	 *
	 * This is essentially the same as generateFormConfigSchema but with
	 * custom $id and description options. Use generateFormConfigSchema instead
	 * for form configurations.
	 *
	 * @param formConfigSchema - Zod schema for the form configuration structure
	 * @param schemaRegistry - Zod registry containing all component schemas
	 * @param options - Schema generation options
	 * @returns Unified JSON schema with $defs
	 *
	 * @deprecated Use generateFormConfigSchema instead
	 */
	generateUnifiedSchema(
		formConfigSchema: z.ZodObject<any>,
		schemaRegistry: ReturnType<typeof z.registry<FormEngineSchemaMetadata>>,
		options?: {
			id?: string;
			title?: string;
			description?: string;
			target?: 'draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0';
		},
	): any {
		const schema = this.generateFormConfigSchema(formConfigSchema, schemaRegistry, {
			target: options?.target,
		});

		if (options?.id) {
			schema.$id = options.id;
		}

		return schema;
	}

	/**
	 * Generate JSON schema for form configuration objects.
	 *
	 * This is the main method for generating schemas that describe
	 * the structure of form configuration objects passed to the renderer.
	 *
	 * Handles:
	 * - Dynamic schema generation from registered components
	 * - Nested and recursive schema relationships (via Zod registry)
	 * - Schema normalization (anyOf -> oneOf for consistency)
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

		this.normalizeSchema(schema);

		return schema;
	}

	/**
	 * Normalize schema to use consistent patterns.
	 *
	 * Converts:
	 * - anyOf to oneOf (for consistency)
	 * - Single $ref to oneOf array (for uniform structure)
	 *
	 * This is done recursively to handle nested schemas.
	 */
	private normalizeSchema(schema: any): void {
		this.convertAnyOfToOneOf(schema);

		if (schema.properties) {
			['layout', 'stepper'].forEach((key) => {
				const prop = schema.properties[key];
				if (prop?.$ref && !prop.oneOf) {
					const ref = prop.$ref;
					delete prop.$ref;
					prop.oneOf = [{ $ref: ref }];
				}
			});

			if (schema.properties.elements?.items?.$ref && !schema.properties.elements.items.oneOf) {
				const ref = schema.properties.elements.items.$ref;
				delete schema.properties.elements.items.$ref;
				schema.properties.elements.items.oneOf = [{ $ref: ref }];
			}

			if (schema.properties.actions?.items?.$ref && !schema.properties.actions.items.oneOf) {
				const ref = schema.properties.actions.items.$ref;
				delete schema.properties.actions.items.$ref;
				schema.properties.actions.items.oneOf = [{ $ref: ref }];
			}
		}
	}

	/**
	 * Recursively convert anyOf to oneOf throughout the schema.
	 *
	 * This provides consistency in the generated schemas and makes
	 * them easier to work with in validation libraries.
	 */
	private convertAnyOfToOneOf(obj: any): void {
		if (obj && typeof obj === 'object') {
			if (obj.anyOf) {
				obj.oneOf = obj.anyOf;
				delete obj.anyOf;
			}
			for (const key in obj) {
				if (typeof obj[key] === 'object') {
					this.convertAnyOfToOneOf(obj[key]);
				}
			}
		}
	}
}
