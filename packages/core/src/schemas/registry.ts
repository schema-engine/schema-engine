import { z } from 'zod';
/**
 * Global registry for form field types using Zod 4 registries
 * This provides metadata storage and JSON schema generation capabilities
 */
export const formFieldRegistry = z.registry<FormEngine.FieldMetadata>();

/**
 * Component registry for field components
 * Generic registry that can work with any component type.
 * @example
 * ```ts
 * const reactFormFieldRegistry = new FormFieldComponentRegistry<React.ComponentType<any>>();
 * function registerFieldType(registration: FormEngine.FieldRegistration<React.ComponentType<any>>): void {
 *   reactFormFieldRegistry.register(registration);
 * }
 * ```
 */
export class FormFieldComponentRegistry<TComponent = any> {
	private components = new Map<string, FormEngine.FieldRegistration<TComponent>>();
	private schemas = new Map<string, z.ZodSchema<any>>();
	private zodRegistry: ReturnType<typeof z.registry<FormEngine.FieldMetadata>>;

	constructor(zodRegistry: ReturnType<typeof z.registry<FormEngine.FieldMetadata>> = formFieldRegistry) {
		this.zodRegistry = zodRegistry;
	}

	/**
	 * Register a new field type with its component and schema
	 */
	register(registration: FormEngine.FieldRegistration<TComponent>): void {
		const { componentId, schema, metadata } = registration;

		const existingRegistration = this.components.get(componentId);
		if (existingRegistration?.schema && this.zodRegistry.has(existingRegistration.schema)) {
			this.zodRegistry.remove(existingRegistration.schema);
		}

		this.components.set(componentId, registration);
		this.schemas.set(componentId, schema);

		if (metadata) {
			const enhancedMetadata: FormEngine.FieldMetadata = {
				...metadata,
				id: componentId,
			};

			this.zodRegistry.add(schema, enhancedMetadata);
		}
	}

	/**
	 * Unregister a field type and remove it from all registries
	 */
	unregister(componentId: FormEngine.ComponentId | string): boolean {
		const registration = this.components.get(componentId);
		if (!registration) return false;

		this.components.delete(componentId);
		this.schemas.delete(componentId);

		const schema = registration.schema;
		if (schema && this.zodRegistry.has(schema)) {
			this.zodRegistry.remove(schema);
		}

		return true;
	}

	/**
	 * Get component for a field type
	 */
	getComponent(fieldType: FormEngine.ComponentId): TComponent | undefined {
		return this.components.get(fieldType)?.component;
	}

	/**
	 * Get schema for a field type
	 */
	getSchema(fieldType: FormEngine.ComponentId): z.ZodSchema<any> | undefined {
		return this.schemas.get(fieldType);
	}

	/**
	 * Get runtime schema for a field type.
	 */
	getRuntimeSchema(componentId: string): z.ZodTypeAny | undefined {
		return this.schemas.get(componentId);
	}

	/**
	 * Get serializable schema for a field type.
	 */
	getSerializableSchema(fieldType: FormEngine.ComponentId): z.ZodSchema<any> | undefined {
		return this.schemas.get(fieldType);
	}

	/**
	 * Get all registered field types
	 */
	getFieldTypes(): FormEngine.ComponentId[] {
		return Array.from(this.components.keys()) as FormEngine.ComponentId[];
	}

	/**
	 * Get metadata for a field type
	 */
	getMetadata(fieldType: FormEngine.ComponentId): FormEngine.FieldMetadata | undefined {
		const schema = this.getRuntimeSchema(fieldType);
		if (!schema) return undefined;

		return this.zodRegistry.get(schema);
	}

	/**
	 * Check if a field type is registered
	 */
	hasFieldType(fieldType: FormEngine.ComponentId): boolean {
		return this.components.has(fieldType);
	}

	/**
	 * Clear specific registered fields by their component IDs
	 * More flexible and explicit than clearing by assumption
	 */
	clearFields(componentIds: (FormEngine.ComponentId | string)[]): void {
		for (const componentId of componentIds) {
			this.unregister(componentId);
		}
	}

	/**
	 * Clear all registered field types from the registry
	 * Equivalent to Zod's registry.clear() but also clears our component map
	 */
	clear(): void {
		this.zodRegistry.clear();
		this.components.clear();
		this.schemas.clear();
	} /**
	 * Get all registered field component IDs as strings
	 * Useful for inspection and selective operations
	 */
	getRegisteredFields(): string[] {
		return Array.from(this.components.keys());
	}

	/**
	 * Create a union schema of all registered field types
	 * This is used for dynamic schemas like array elements
	 */
	createFieldUnionSchema(): z.ZodSchema<FormEngine.FieldConfig> | z.ZodNever {
		const schemas = Array.from(this.schemas.values());

		if (schemas.length === 0) {
			return z.never();
		}

		if (schemas.length === 1) {
			return schemas[0];
		}

		return z.union(schemas as [z.ZodSchema<any>, z.ZodSchema<any>, ...z.ZodSchema<any>[]]);
	}

	/**
	 * Create a union schema of serializable field types.
	 * This is used for JSON schema generation and serialization.
	 */
	createSerializableFieldUnionSchema(): z.ZodSchema<FormEngine.FieldConfig> | z.ZodNever {
		return this.createFieldUnionSchema();
	}

	/**
	 * Update array element schemas to use registered fields
	 * This should be called after all fields are registered
	 */
	updateArrayElementSchemas(): void {
		const fieldUnion = this.createFieldUnionSchema();

		if (typeof global !== 'undefined' && (global as any).FormEngine?.ArrayElementsExtensionSchema) {
			const arraySchema = (global as any).FormEngine.ArrayElementsExtensionSchema;
			arraySchema.shape.elements = z.lazy(() => z.array(fieldUnion).min(1));
		}
	}

	/**
	 * Validate a field configuration against its schema
	 */
	validateField(fieldConfig: unknown): { success: boolean; data?: FormEngine.FieldConfig; error?: string } {
		if (!fieldConfig || typeof fieldConfig !== 'object') {
			return { success: false, error: 'Field configuration must be an object' };
		}

		const fieldType = (fieldConfig as any).componentId;
		if (!fieldType) {
			return { success: false, error: 'Field componentId is required' };
		}

		const schema = this.getRuntimeSchema(fieldType);
		if (!schema) {
			return { success: false, error: `Unknown field type: ${fieldType}` };
		}

		try {
			const result = schema.parse(fieldConfig) as FormEngine.FieldConfig;
			return { success: true, data: result };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
		}
	}

	/**
	 * Convert field configuration to serializable format
	 */
	toSerializable(fieldConfig: unknown): FormEngine.FieldConfig | null {
		if (!fieldConfig || typeof fieldConfig !== 'object') {
			return null;
		}

		const componentId = (fieldConfig as any).componentId;
		const schema = this.getSerializableSchema(componentId);
		if (!schema) return null;

		try {
			return schema.parse(fieldConfig) as FormEngine.FieldConfig;
		} catch {
			return null;
		}
	}

	/**
	 * Generate JSON schema for a field type
	 */
	toJSONSchema(fieldType: FormEngine.ComponentId): unknown {
		const schema = this.getRuntimeSchema(fieldType);
		if (!schema) return null;

		try {
			return z.toJSONSchema(schema, {
				metadata: this.zodRegistry,
				target: 'draft-2020-12',
			});
		} catch {
			return null;
		}
	}

	/**
	 * Generate JSON schema for all registered field types
	 */
	toJSONSchemaRegistry(): Record<string, unknown> {
		const schemas: Record<string, unknown> = {};

		for (const fieldType of this.getFieldTypes()) {
			const jsonSchema = this.toJSONSchema(fieldType);
			if (jsonSchema) {
				schemas[fieldType] = jsonSchema;
			}
		}

		return schemas;
	}

	/**
	 * Export registry metadata as JSON
	 */
	exportMetadata(): Record<string, FormEngine.FieldMetadata> {
		const metadata: Record<string, FormEngine.FieldMetadata> = {};

		for (const fieldType of this.getFieldTypes()) {
			const meta = this.getMetadata(fieldType);
			if (meta) {
				metadata[fieldType] = meta;
			}
		}

		return metadata;
	}
}
