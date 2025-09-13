import { z } from 'zod';
import type { FieldConfig, ComponentId } from './field-config';

/**
 * Global registry for form field types using Zod 4 registries
 * This provides metadata storage and JSON schema generation capabilities
 */
export const formFieldRegistry = z.registry<FormEngine.FieldMetadata>();

/**
 * Component registry for field components
 * Maps field type to React component and schemas
 */
export class FormFieldComponentRegistry {
	private components = new Map<string, FormEngine.FieldRegistration>();
	private schemas = new Map<string, { runtime: z.ZodSchema<any>; serializable: z.ZodSchema<any> }>();

	/**
	 * Register a new field type with its component and schemas
	 */
	register(registration: FormEngine.FieldRegistration): void {
		const { componentId, runtimeSchema, serializableSchema, metadata } = registration;

		this.components.set(componentId, registration);

		this.schemas.set(componentId, {
			runtime: runtimeSchema,
			serializable: serializableSchema,
		});

		if (metadata) {
			const enhancedMetadata: FormEngine.FieldMetadata = {
				...metadata,
				id: componentId,
			};

			formFieldRegistry.add(runtimeSchema, enhancedMetadata);
		}
	}

	/**
	 * Unregister a field type and remove it from all registries
	 */
	unregister(componentId: ComponentId | string): boolean {
		const registration = this.components.get(componentId);
		if (!registration) return false;

		this.components.delete(componentId);
		this.schemas.delete(componentId);

		const runtimeSchema = registration.runtimeSchema;
		if (runtimeSchema && formFieldRegistry.has(runtimeSchema)) {
			formFieldRegistry.remove(runtimeSchema);
		}

		return true;
	}

	/**
	 * Get component for a field type
	 */
	getComponent(fieldType: ComponentId): React.ComponentType<any> | undefined {
		return this.components.get(fieldType)?.component;
	}

	/**
	 * Get runtime schema for a field type
	 */
	getRuntimeSchema(fieldType: ComponentId): z.ZodSchema<any> | undefined {
		return this.schemas.get(fieldType)?.runtime;
	}

	/**
	 * Get serializable schema for a field type
	 */
	getSerializableSchema(fieldType: ComponentId): z.ZodSchema<any> | undefined {
		return this.schemas.get(fieldType)?.serializable;
	}

	/**
	 * Get all registered field types
	 */
	getFieldTypes(): ComponentId[] {
		return Array.from(this.components.keys()) as ComponentId[];
	}

	/**
	 * Get metadata for a field type
	 */
	getMetadata(fieldType: ComponentId): FormEngine.FieldMetadata | undefined {
		const schema = this.getRuntimeSchema(fieldType);
		if (!schema) return undefined;

		return formFieldRegistry.get(schema);
	}

	/**
	 * Check if a field type is registered
	 */
	hasFieldType(fieldType: ComponentId): boolean {
		return this.components.has(fieldType);
	}

	/**
	 * Clear specific registered fields by their component IDs
	 * More flexible and explicit than clearing by assumption
	 */
	clearFields(componentIds: (ComponentId | string)[]): void {
		componentIds.forEach((componentId) => this.unregister(componentId));
	}

	/**
	 * Clear all registered field types from the registry
	 * Equivalent to Zod's registry.clear() but also clears our component map
	 */
	clear(): void {
		formFieldRegistry.clear();
		this.components.clear();
		this.schemas.clear();
	}

	/**
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
	createFieldUnionSchema(): z.ZodSchema<FieldConfig> | z.ZodNever {
		const schemas = Array.from(this.schemas.values()).map((s) => s.runtime);

		if (schemas.length === 0) {
			return z.never();
		}

		if (schemas.length === 1) {
			return schemas[0];
		}

		// Create union schema from all registered runtime schemas
		return z.union(schemas as [z.ZodSchema<any>, z.ZodSchema<any>, ...z.ZodSchema<any>[]]);
	}

	/**
	 * Create a union schema of serializable field types
	 * This is used for JSON schema generation and serialization
	 */
	createSerializableFieldUnionSchema(): z.ZodSchema<FieldConfig> | z.ZodNever {
		const schemas = Array.from(this.schemas.values()).map((s) => s.serializable);

		if (schemas.length === 0) {
			return z.never();
		}

		if (schemas.length === 1) {
			return schemas[0];
		}

		// Create union schema from all registered serializable schemas
		return z.union(schemas as [z.ZodSchema<any>, z.ZodSchema<any>, ...z.ZodSchema<any>[]]);
	}

	/**
	 * Update array element schemas to use registered fields
	 * This should be called after all fields are registered
	 */
	updateArrayElementSchemas(): void {
		const fieldUnion = this.createFieldUnionSchema();

		// Find and update array elements extension schema
		if (typeof global !== 'undefined' && (global as any).FormEngine?.ArrayElementsExtensionSchema) {
			const arraySchema = (global as any).FormEngine.ArrayElementsExtensionSchema;
			// Update the elements property to use the union schema
			arraySchema.shape.elements = z.lazy(() => z.array(fieldUnion).min(1));
		}
	}

	/**
	 * Validate a field configuration against its schema
	 */
	validateField(fieldConfig: unknown): { success: boolean; data?: FieldConfig; error?: string } {
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
			const result = schema.parse(fieldConfig) as FieldConfig;
			return { success: true, data: result };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
		}
	}

	/**
	 * Convert field configuration to serializable format
	 */
	toSerializable(fieldConfig: unknown): FieldConfig | null {
		if (!fieldConfig || typeof fieldConfig !== 'object') {
			return null;
		}

		const componentId = (fieldConfig as any).componentId;
		const schema = this.getSerializableSchema(componentId);
		if (!schema) return null;

		try {
			return schema.parse(fieldConfig) as FieldConfig;
		} catch {
			return null;
		}
	}

	/**
	 * Generate JSON schema for a field type
	 */
	toJSONSchema(fieldType: ComponentId): unknown {
		const schema = this.getRuntimeSchema(fieldType);
		if (!schema) return null;

		try {
			return z.toJSONSchema(schema, {
				metadata: formFieldRegistry,
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

/**
 * Default form field registry instance
 */
export const defaultFormFieldRegistry = new FormFieldComponentRegistry();

/**
 * Convenience function for registering field types
 */
export function registerFieldType(registration: FormEngine.FieldRegistration): void {
	defaultFormFieldRegistry.register(registration);
}
