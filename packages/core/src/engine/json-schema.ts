import type { FormEngine } from './form-engine';

/**
 * JSON Schema generation utilities.
 *
 * Generate JSON schemas for form configurations, enabling:
 * - Validation in external tools
 * - TypeScript type generation
 * - Documentation generation
 * - Form builder UI schema
 */

/**
 * Generate JSON schema for all registered elements.
 *
 * @param engine - FormEngine instance
 * @returns JSON Schema object
 */
export function generateElementsSchema(engine: FormEngine): Record<string, unknown> {
	const elements = engine.getAllElements();
	const schemas: Record<string, unknown> = {};

	for (const element of elements) {
		try {
			// Use Zod's native JSON schema generation (v4)
			const zodSchema = element.schema as any;
			if (zodSchema && typeof zodSchema.toJsonSchema === 'function') {
				schemas[element.componentId] = zodSchema.toJsonSchema();
			}
		} catch (_error) {
			// Schema generation failed - skip this element
			console.warn(`Failed to generate schema for element: ${element.componentId}`);
		}
	}

	return schemas;
}

/**
 * Generate JSON schema for all registered layouts.
 *
 * @param engine - FormEngine instance
 * @returns JSON Schema object
 */
export function generateLayoutsSchema(engine: FormEngine): Record<string, unknown> {
	const layouts = engine.getAllLayouts();
	const schemas: Record<string, unknown> = {};

	for (const layout of layouts) {
		try {
			const zodSchema = layout.schema as any;
			if (zodSchema && typeof zodSchema.toJsonSchema === 'function') {
				schemas[layout.layoutId] = zodSchema.toJsonSchema();
			}
		} catch (_error) {
			console.warn(`Failed to generate schema for layout: ${layout.layoutId}`);
		}
	}

	return schemas;
}

/**
 * Generate JSON schema for all registered steppers.
 *
 * @param engine - FormEngine instance
 * @returns JSON Schema object
 */
export function generateSteppersSchema(engine: FormEngine): Record<string, unknown> {
	const steppers = engine.getAllSteppers();
	const schemas: Record<string, unknown> = {};

	for (const stepper of steppers) {
		try {
			const zodSchema = stepper.schema as any;
			if (zodSchema && typeof zodSchema.toJsonSchema === 'function') {
				schemas[stepper.stepperId] = zodSchema.toJsonSchema();
			}
		} catch (_error) {
			console.warn(`Failed to generate schema for stepper: ${stepper.stepperId}`);
		}
	}

	return schemas;
}

/**
 * Generate complete JSON schema for the form engine.
 *
 * @param engine - FormEngine instance
 * @returns Complete JSON Schema object
 */
export function generateFormEngineSchema(engine: FormEngine): Record<string, unknown> {
	return {
		$schema: 'http://json-schema.org/draft-07/schema#',
		title: 'Form Engine Configuration',
		description: 'JSON schema for form configurations',
		definitions: {
			elements: generateElementsSchema(engine),
			layouts: generateLayoutsSchema(engine),
			steppers: generateSteppersSchema(engine),
		},
		type: 'object',
		properties: {
			id: {
				type: 'string',
				description: 'Unique form identifier',
			},
			title: {
				type: 'string',
				description: 'Form title',
			},
			description: {
				type: 'string',
				description: 'Form description',
			},
			fields: {
				type: 'array',
				description: 'Form fields',
				items: {
					type: 'object',
					required: ['componentId', 'config'],
					properties: {
						componentId: {
							type: 'string',
							enum: engine.getElementIds(),
						},
						config: {
							type: 'object',
						},
					},
				},
			},
			layout: {
				type: 'object',
				properties: {
					layoutId: {
						type: 'string',
						enum: engine.getLayoutIds(),
					},
					config: {
						type: 'object',
					},
				},
			},
			stepper: {
				type: 'object',
				properties: {
					stepperId: {
						type: 'string',
						enum: engine.getStepperIds(),
					},
					config: {
						type: 'object',
					},
				},
			},
		},
		required: ['id', 'fields'],
	};
}
