import type {
	InputRegistration,
	StaticRegistration,
	LayoutRegistration,
	StepperRegistration,
	BuilderActionRegistration,
} from '@/types';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { SchemaGenerator } from '@/engine/schema-generator';

/**
 * Metadata for form engine JSON Schema generation.
 * Used across all component types (elements, layouts, steppers, actions).
 */
export interface FormEngineSchemaMetadata {
	id: string;
	componentType: 'element' | 'layout' | 'stepper' | 'action';
	title?: string;
	description?: string;
	category?: string;
	deprecated?: boolean;
	examples?: unknown[];
	[key: string]: unknown;
}

/**
 * Engine registries - internal storage for all registered components.
 */
export interface EngineRegistries {
	elements: Map<string, InputRegistration<any, any, any> | StaticRegistration<any, any, any>>;
	layouts: Map<string, LayoutRegistration<any, any, any>>;
	steppers: Map<string, StepperRegistration<any, any, any>>;
	actions: Map<string, BuilderActionRegistration<any>>;
	schemaRegistry: ReturnType<typeof z.registry<FormEngineSchemaMetadata>>;
	formConfigSchema: z.ZodObject<any>;
}

/**
 * FormEngine - Immutable runtime engine for form rendering and execution.
 *
 * Created by FormEngineBuilder.build(). Provides methods for:
 * - Retrieving registered components
 * - Creating form instances
 * - Validating configurations
 * - Generating JSON schemas
 *
 * @example
 * ```typescript
 * const engine = new FormEngineBuilder()
 *   .addElement(textInputRegistration)
 *   .build();
 *
 * const element = engine.getElement('text');
 * const allElements = engine.getAllElements();
 * ```
 */
export class FormEngine<
	_TElements extends Record<string, unknown> = Record<string, never>,
	_TLayouts extends Record<string, unknown> = Record<string, never>,
	_TSteppers extends Record<string, unknown> = Record<string, never>,
	_TActions extends Record<string, unknown> = Record<string, never>,
> {
	private readonly registries: EngineRegistries;
	private readonly schemaGenerator: SchemaGenerator;

	constructor(registries: EngineRegistries) {
		this.schemaGenerator = new SchemaGenerator();
		this.registries = {
			elements: new Map(registries.elements),
			layouts: new Map(registries.layouts),
			steppers: new Map(registries.steppers),
			actions: new Map(registries.actions),
			schemaRegistry: registries.schemaRegistry,
			formConfigSchema: registries.formConfigSchema,
		};

		logger.debug('FormEngine initialized', {
			elements: this.registries.elements.size,
			layouts: this.registries.layouts.size,
			steppers: this.registries.steppers.size,
			actions: this.registries.actions.size,
		});
	}

	/**
	 * Get an element registration by ID.
	 */
	getElement(id: string): InputRegistration<any, any, any> | StaticRegistration<any, any, any> | undefined {
		return this.registries.elements.get(id);
	}

	/**
	 * Get all element registrations.
	 */
	getAllElements(): (InputRegistration<any, any, any> | StaticRegistration<any, any, any>)[] {
		return Array.from(this.registries.elements.values());
	}

	/**
	 * Get all registered element IDs.
	 */
	getElementIds(): string[] {
		return Array.from(this.registries.elements.keys());
	}

	/**
	 * Check if an element is registered.
	 */
	hasElement(id: string): boolean {
		return this.registries.elements.has(id);
	}

	/**
	 * Get a registered layout by id.
	 */
	getLayout(id: string): LayoutRegistration<any, any, any> | undefined {
		return this.registries.layouts.get(id);
	}

	/**
	 * Get all registered layouts.
	 */
	getAllLayouts(): LayoutRegistration<any, any, any>[] {
		return Array.from(this.registries.layouts.values());
	}

	/**
	 * Get all registered layout IDs.
	 */
	getLayoutIds(): string[] {
		return Array.from(this.registries.layouts.keys());
	}

	/**
	 * Check if a layout is registered.
	 */
	hasLayout(id: string): boolean {
		return this.registries.layouts.has(id);
	}

	/**
	 * Get a registered stepper by id.
	 */
	getStepper(id: string): StepperRegistration<any, any, any> | undefined {
		return this.registries.steppers.get(id);
	}

	/**
	 * Get all registered steppers.
	 */
	getAllSteppers(): StepperRegistration<any, any, any>[] {
		return Array.from(this.registries.steppers.values());
	}

	/**
	 * Get all registered stepper IDs.
	 */
	getStepperIds(): string[] {
		return Array.from(this.registries.steppers.keys());
	}

	/**
	 * Check if a stepper is registered.
	 */
	hasStepper(id: string): boolean {
		return this.registries.steppers.has(id);
	}

	/**
	 * Get a registered action by id.
	 */
	getAction(id: string): BuilderActionRegistration<any> | undefined {
		return this.registries.actions.get(id);
	}

	/**
	 * Get all registered actions.
	 */
	getAllActions(): BuilderActionRegistration[] {
		return Array.from(this.registries.actions.values());
	}

	/**
	 * Get all registered action types.
	 */
	getActionTypes(): string[] {
		return Array.from(this.registries.actions.keys());
	}

	/**
	 * Check if an action is registered.
	 */
	hasAction(id: string): boolean {
		return this.registries.actions.has(id);
	}

	/**
	 * Get summary of all registered components.
	 */
	getSummary() {
		return {
			elements: {
				count: this.registries.elements.size,
				ids: this.getElementIds(),
			},
			layouts: {
				count: this.registries.layouts.size,
				ids: this.getLayoutIds(),
			},
			steppers: {
				count: this.registries.steppers.size,
				ids: this.getStepperIds(),
			},
			actions: {
				count: this.registries.actions.size,
				types: this.getActionTypes(),
			},
		};
	}

	/**
	 * Get the schema registry for JSON Schema generation.
	 */
	getSchemaRegistry() {
		return this.registries.schemaRegistry;
	}

	/**
	 * Generate a collection of JSON Schemas for all registered components.
	 * Uses Zod v4 native registry-based JSON Schema generation.
	 *
	 * Returns a collection of individual schemas (one per component).
	 * Each schema has its own $id and can reference other schemas via $ref.
	 *
	 * @param options - Configuration for JSON Schema generation
	 * @param options.target - JSON Schema version to target
	 * @param options.uri - Function to generate URIs for $ref
	 * @returns Object with 'schemas' property containing all component schemas
	 *
	 * @example
	 * ```typescript
	 * const engine = new FormEngineBuilder()
	 *   .addElement(textInputRegistration)
	 *   .build();
	 *
	 * const collection = engine.generateJSONSchema();
	 * // { schemas: { 'element:text': {...}, ... } }
	 * ```
	 */
	generateJSONSchemaCollection(options?: {
		target?: 'draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0';
		uri?: (id: string) => string;
	}) {
		return z.toJSONSchema(this.registries.schemaRegistry, {
			target: options?.target || 'draft-2020-12',
			uri: options?.uri || ((id: string) => `#/definitions/${id}`),
		});
	}

	/**
	 * Generate a unified JSON Schema with $defs for all registered components.
	 *
	 * Creates a proper JSON Schema document with:
	 * - A root schema defining the form configuration structure
	 * - A $defs section with all component schemas
	 * - Discriminated unions for elements/layouts/steppers using $ref
	 *
	 * This is the recommended format for:
	 * - Form builders (single schema to validate against)
	 * - Documentation generation
	 * - API specifications (OpenAPI)
	 *
	 * @param options - Configuration for JSON Schema generation
	 * @returns Complete JSON Schema with $defs
	 *
	 * @example
	 * ```typescript
	 * const schema = engine.generateJSONSchema({
	 *   target: 'draft-2020-12'
	 * });
	 * // {
	 * //   $schema: "...",
	 * //   $defs: { 'element:text': {...}, ... },
	 * //   type: "object",
	 * //   properties: { ... }
	 * // }
	 * ```
	 */
	generateJSONSchema(options?: {
		target?: 'draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0';
		includeFormSchema?: boolean;
	}) {
		const target = options?.target || 'draft-2020-12';
		const includeFormSchema = options?.includeFormSchema !== false;

		const collection = this.generateJSONSchemaCollection({ target });

		const $defs: Record<string, unknown> = {};
		for (const [id, schema] of Object.entries(collection.schemas)) {
			$defs[id] = schema;
		}

		if (!includeFormSchema) {
			return {
				$schema: 'https://json-schema.org/draft/2020-12/schema',
				$id: 'form-engine-components',
				title: 'Form Engine Components',
				description: 'All registered form engine components (elements, layouts, steppers, actions)',
				$defs,
			};
		}

		const elementRefs = this.getElementIds().map((id) => ({
			$ref: `#/$defs/element:${id}`,
		}));

		const layoutRefs = this.getLayoutIds().map((id) => ({
			$ref: `#/$defs/layout:${id}`,
		}));

		const stepperRefs = this.getStepperIds().map((id) => ({
			$ref: `#/$defs/stepper:${id}`,
		}));

		const actionRefs = this.getActionTypes().map((id) => ({
			$ref: `#/$defs/action:${id}`,
		}));

		return {
			$schema: 'https://json-schema.org/draft/2020-12/schema',
			$id: 'form-configuration',
			title: 'Form Configuration',
			description: 'Complete form configuration schema with all registered components',
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
				elements: {
					type: 'array',
					description: 'Form elements (inputs, content, decoration, interactive)',
					items: elementRefs.length > 0 ? { oneOf: elementRefs } : { type: 'object' },
				},
				layout: {
					description: 'Layout configuration',
					...(layoutRefs.length > 0 ? { oneOf: layoutRefs } : { type: 'object' }),
				},
				stepper: {
					description: 'Stepper configuration for multi-step forms',
					...(stepperRefs.length > 0 ? { oneOf: stepperRefs } : { type: 'object' }),
				},
				actions: {
					type: 'array',
					description: 'Actions to execute on form events',
					items: actionRefs.length > 0 ? { oneOf: actionRefs } : { type: 'object' },
				},
			},
			required: ['id', 'elements'],
			$defs,
		};
	}

	/**
	 * Get the Zod schema for form configuration validation.
	 *
	 * Returns the live Zod schema that can be used for runtime validation.
	 * This is the same schema used to generate the JSON Schema, but you can
	 * use it directly with Zod's validation methods.
	 *
	 * @returns Zod schema for form configuration
	 *
	 * @example
	 * ```typescript
	 * const engine = new FormEngineBuilder()
	 *   .addElement(textInputRegistration)
	 *   .build();
	 *
	 * const schema = engine.getFormConfigSchema();
	 *
	 * // Validate a form config
	 * const result = schema.safeParse(myFormConfig);
	 * if (result.success) {
	 *   console.log('Valid config:', result.data);
	 * } else {
	 *   console.error('Invalid config:', result.error);
	 * }
	 * ```
	 */
	getFormConfigSchema() {
		return this.registries.formConfigSchema;
	}

	/**
	 * Generate a JSON Schema for form configuration objects.
	 *
	 * This schema represents the structure of the configuration object you pass to the form renderer.
	 * It's dynamically built from your registered components, so any changes to the schema
	 * (new properties, new component types, etc.) are automatically reflected.
	 *
	 * Use this for:
	 * - Validating form configs before saving to database
	 * - Generating TypeScript types for form configs
	 * - Providing validation in form builders
	 * - API documentation
	 *
	 * @param options - Configuration for JSON Schema generation
	 * @param options.target - JSON Schema version to target (default: 'draft-2020-12')
	 * @param options.additionalProperties - Allow additional properties in form config (default: false)
	 * @returns JSON Schema for form configuration
	 *
	 * @example
	 * ```typescript
	 * const engine = new FormEngineBuilder()
	 *   .addElement(textInputRegistration)
	 *   .build();
	 *
	 * const configSchema = engine.generateFormConfigSchema();
	 *
	 * // Use with a validator like Ajv
	 * const ajv = new Ajv();
	 * const validate = ajv.compile(configSchema);
	 * const isValid = validate(myFormConfig);
	 * ```
	 */
	generateFormConfigSchema(options?: {
		target?: 'draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0';
		additionalProperties?: boolean;
	}) {
		return this.schemaGenerator.generateFormConfigSchema(
			this.registries.formConfigSchema,
			this.registries.schemaRegistry,
			options,
		);
	}

	/**
	 * Create a new builder with all current registrations.
	 * This allows extending an existing FormEngine with additional components or overriding actions.
	 *
	 * @example
	 * ```typescript
	 * const baseEngine = new FormEngineBuilder()
	 *   .addElement(InputElement)
	 *   .addAction(submitPlugin())
	 *   .build();
	 *
	 * const extendedEngine = baseEngine.extend()
	 *   .addAction(submitPlugin({ onSuccess: customHandler }))
	 *   .build();
	 * ```
	 */
	extend(): import('@/builder/form-engine-builder').FormEngineBuilder<_TElements, _TLayouts, _TSteppers, _TActions> {
		const { FormEngineBuilder } = require('@/builder/form-engine-builder');
		const { ElementRegistry, LayoutRegistry, StepperRegistry, ActionRegistry } = require('@/registries');

		const elementRegistry = new ElementRegistry();
		const layoutRegistry = new LayoutRegistry();
		const stepperRegistry = new StepperRegistry();
		const actionRegistry = new ActionRegistry();

		for (const [_key, value] of this.registries.elements.entries()) {
			elementRegistry.register(value);
		}
		for (const [_key, value] of this.registries.layouts.entries()) {
			layoutRegistry.register(value);
		}
		for (const [_key, value] of this.registries.steppers.entries()) {
			stepperRegistry.register(value);
		}
		for (const [_key, value] of this.registries.actions.entries()) {
			actionRegistry.register(value);
		}

		const builder = new FormEngineBuilder(elementRegistry, layoutRegistry, stepperRegistry, actionRegistry);

		logger.debug('Extended FormEngine to builder', {
			elements: this.registries.elements.size,
			layouts: this.registries.layouts.size,
			steppers: this.registries.steppers.size,
			actions: this.registries.actions.size,
		});

		return builder as import('@/builder/form-engine-builder').FormEngineBuilder<
			_TElements,
			_TLayouts,
			_TSteppers,
			_TActions
		>;
	}
}
