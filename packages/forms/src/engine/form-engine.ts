import type {
	BuilderActionBaseContext,
	BuilderActionRegistration,
	InputRegistration,
	LayoutRegistration,
	StaticRegistration,
	StepperRegistration,
} from '@/types';
import type { FormActionTrigger } from '@/actions';
import { FormComposer } from '@/builder/form-composer';
import { ElementRegistry, LayoutRegistry, StepperRegistry } from '@/registries';
import { ActionRegistry } from '@schema-engine/actions';
import { logger } from '@/lib/logger';
import type { StandardJSONSchemaV1 } from '@/lib/standard-json-schema';
import { z } from 'zod';
import { FormConfigBuilder } from '@/builder/form-config-builder';
import type { FormEngineSchemaArtifacts, FormEngineSchemaMetadataRegistry } from './schema-artifacts';
import { createActionConfigValidatorMap, createFormEngineSchemaArtifacts } from './schema-artifacts';
export * from './component-type';

/**
 * Engine registries - internal storage for all registered components.
 */
export interface EngineRegistries {
	elements: Map<string, InputRegistration<any, any, any> | StaticRegistration<any, any, any>>;
	layouts: Map<string, LayoutRegistration<any, any, any>>;
	steppers: Map<string, StepperRegistration<any, any, any>>;
	actions: Map<string, BuilderActionRegistration>;
	schemaArtifacts?: FormEngineSchemaArtifacts;
	schemaRegistry?: FormEngineSchemaMetadataRegistry;
	formConfigSchema?: z.ZodTypeAny;
}

function resolveSchemaArtifacts(registries: EngineRegistries): FormEngineSchemaArtifacts {
	if (registries.schemaArtifacts) {
		return registries.schemaArtifacts;
	}

	if (!registries.schemaRegistry || !registries.formConfigSchema) {
		throw new Error('FormEngine requires schemaArtifacts or both schemaRegistry and formConfigSchema');
	}

	return createFormEngineSchemaArtifacts(
		registries.schemaRegistry,
		registries.formConfigSchema,
		undefined,
		createActionConfigValidatorMap(registries.actions.values()),
	);
}

/**
 * FormEngine - Immutable runtime engine for form rendering and execution.
 *
 * Created by FormComposer.build(). Provides methods for:
 * - Retrieving registered components
 * - Creating form instances
 * - Validating configurations
 * - Generating JSON schemas
 *
 * @example
 * ```typescript
 * const engine = new FormComposer()
 *   .addElement(textInputRegistration)
 *   .build();
 *
 * const element = engine.getElement('text');
 * const allElements = engine.getAllElements();
 * ```
 */
export class FormEngine<
	TElements extends Record<string, unknown> = Record<never, unknown>,
	TLayouts extends Record<string, unknown> = Record<never, unknown>,
	TSteppers extends Record<string, unknown> = Record<never, unknown>,
	TActions extends Record<string, unknown> = Record<never, unknown>,
> {
	private readonly registries: EngineRegistries;
	private readonly schemaArtifacts: FormEngineSchemaArtifacts;

	constructor(registries: EngineRegistries) {
		const schemaArtifacts = resolveSchemaArtifacts(registries);

		this.registries = {
			elements: new Map(registries.elements),
			layouts: new Map(registries.layouts),
			steppers: new Map(registries.steppers),
			actions: new Map(registries.actions),
			schemaArtifacts,
			schemaRegistry: schemaArtifacts.metadataRegistry,
			formConfigSchema: schemaArtifacts.formConfigValidator,
		};
		this.schemaArtifacts = schemaArtifacts;

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
	getAction(id: string): BuilderActionRegistration | undefined {
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
	 * Get the schema artifacts used by the engine.
	 * This exposes the serializer boundary as a single object so callers can use
	 * advanced schema capabilities without the engine leaking implementation details.
	 */
	getSchemaArtifacts() {
		return this.schemaArtifacts;
	}

	/**
	 * Get the Standard JSON Schema-compatible form-config schema object.
	 * The returned wrapper follows the `~standard.jsonSchema.input/output` shape.
	 */
	getFormConfigStandardSchema(): StandardJSONSchemaV1 {
		return this.schemaArtifacts.jsonSchema.formConfigStandardSchema;
	}

	/**
	 * Get the Standard JSON Schema-compatible config schema object for a registered action.
	 * Returns `undefined` when the action type is not registered in this engine.
	 */
	getActionConfigStandardSchema(actionType: string): StandardJSONSchemaV1 | undefined {
		return this.schemaArtifacts.jsonSchema.actionConfigStandardSchemas[actionType];
	}

	/**
	 * Get the schema registry for JSON Schema generation.
	 */
	getSchemaRegistry() {
		return this.schemaArtifacts.metadataRegistry;
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
	 * const engine = new FormComposer()
	 *   .addElement(textInputRegistration)
	 *   .build();
	 *
	 * const collection = engine.generateJSONSchemaCollection();
	 * ```
	 */
	generateJSONSchemaCollection(options?: {
		target?: 'draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0';
		uri?: (id: string) => string;
	}) {
		return this.schemaArtifacts.jsonSchema.generateCollection(options);
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
	 * const engine = new FormComposer()
	 *   .addElement(textInputRegistration)
	 *   .build();
	 *
	 * const schema = engine.getFormConfigSchema();
	 * const result = schema.safeParse(myFormConfig);
	 * if (result.success) {
	 *   console.log('Valid config:', result.data);
	 * } else {
	 *   console.error('Invalid config:', result.error);
	 * }
	 * ```
	 */
	getFormConfigSchema() {
		return this.schemaArtifacts.formConfigValidator;
	}

	/**
	 * Generate a JSON Schema for form configuration objects.
	 *
	 * Use this to:
	 * - Store schemas in a database for versioning
	 * - Export schemas as JSON files
	 * - Validate form configs with external tools (Ajv, etc.)
	 * - Generate API documentation (OpenAPI/Swagger)
	 * - Provide IDE autocomplete for form config JSON
	 *
	 * Returns a complete JSON Schema with all registered components in $defs.
	 *
	 * @param options.target - JSON Schema version (default: 'draft-2020-12')
	 * @returns JSON Schema object for form configuration
	 *
	 * @example
	 * ```typescript
	 * const schema = engine.generateFormConfigSchema();
	 * await db.schemas.insert({ version: '1.0', schema });
	 * fs.writeFileSync('form-schema.json', JSON.stringify(schema, null, 2));
	 * const ajv = new Ajv();
	 * const validate = ajv.compile(schema);
	 * validate(formConfig);
	 * ```
	 */
	generateFormConfigSchema(options?: { target?: 'draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0' }) {
		return this.schemaArtifacts.jsonSchema.generateFormConfig(options);
	}

	/**
	 * Generate a JSON Schema for a registered action configuration object.
	 * Returns `undefined` when the action type is not registered in this engine.
	 */
	generateActionConfigSchema(
		actionType: string,
		options?: { target?: 'draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0' },
	) {
		return this.schemaArtifacts.jsonSchema.generateActionConfig(actionType, options);
	}

	/**
	 * Create a new form definition builder.
	 * Returns a fluent builder initialized with this engine's registered components.
	 *
	 * @example
	 * ```typescript
	 * const form = engine.createFormDefinition()
	 *   .setId('contact-form')
	 *   .addStep(...)
	 *   .build();
	 * ```
	 */
	createFormDefinition(): FormConfigBuilder<TElements, TLayouts, TSteppers, TActions> {
		const elementRegistry = new ElementRegistry();
		const layoutRegistry = new LayoutRegistry();
		const stepperRegistry = new StepperRegistry();
		const actionRegistry = new ActionRegistry<BuilderActionBaseContext, FormActionTrigger>();

		for (const value of this.registries.elements.values()) {
			elementRegistry.register(value);
		}
		for (const value of this.registries.layouts.values()) {
			layoutRegistry.register(value);
		}
		for (const value of this.registries.steppers.values()) {
			stepperRegistry.register(value);
		}
		for (const value of this.registries.actions.values()) {
			actionRegistry.register(value);
		}

		return new FormConfigBuilder(elementRegistry, layoutRegistry, stepperRegistry, actionRegistry);
	}

	/**
	 * Convert this FormEngine back to a FormComposer.
	 * Useful for extending an existing engine with additional components.
	 *
	 * @example
	 * ```typescript
	 * const baseEngine = new FormComposer()
	 *   .addElement(InputElement)
	 *   .build();
	 *
	 * const extendedEngine = baseEngine.toComposer()
	 *   .addAction(submitPlugin({ onSuccess: customHandler }))
	 *   .build();
	 * ```
	 */
	toComposer(): FormComposer {
		const elementRegistry = new ElementRegistry();
		const layoutRegistry = new LayoutRegistry();
		const stepperRegistry = new StepperRegistry();
		const actionRegistry = new ActionRegistry<BuilderActionBaseContext, FormActionTrigger>();

		for (const [_key, value] of this.registries.elements.entries()) {
			elementRegistry.register(value);
		}
		for (const [_key, value] of this.registries.layouts.entries()) {
			layoutRegistry.register(value);
		}
		for (const [_key, value] of this.registries.steppers.entries()) {
			stepperRegistry.register(value);
		}
		for (const value of this.registries.actions.values()) {
			actionRegistry.register(value);
		}

		const composer = new FormComposer(elementRegistry, layoutRegistry, stepperRegistry, actionRegistry);

		logger.debug('Converted FormEngine to composer', {
			elements: this.registries.elements.size,
			layouts: this.registries.layouts.size,
			steppers: this.registries.steppers.size,
			actions: this.registries.actions.size,
		});

		return composer;
	}
}
