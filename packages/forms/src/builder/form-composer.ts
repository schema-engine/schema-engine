import type {
	InputRegistration,
	StaticRegistration,
	LayoutRegistration,
	StepperRegistration,
	BuilderActionRegistration,
	BuilderActionBaseContext,
} from '@/types';
import { FormEngine } from '@/engine/form-engine';
import { ComponentType } from '@/engine/component-type';
import {
	createActionConfigValidatorMap,
	createFormEngineSchemaArtifacts,
	type FormEngineSchemaMetadata,
	type FormEngineSchemaMetadataRegistry,
} from '@/engine/schema-artifacts';
import { logger } from '@/lib/logger';
import { ElementRegistry, LayoutRegistry, StepperRegistry } from '@/registries';
import { GridLayoutConfigSchema } from '@/schemas/base-field';
import { ActionRegistry, type ActionConfigBase } from '@schema-engine/actions';
import { z } from 'zod';
import type { ExtractSchemaType, ExtractTypeId } from './types.utils';
import type { FormActionTrigger } from '@/actions';

/**
 * FormComposer - Composes the capabilities of the Form Engine.
 *
 * Provides a fluent API for registering elements, layouts, steppers, and actions.
 * Once composed, calling `build()` creates an immutable FormEngine instance.
 *
 * Registries are injected as dependencies (with defaults), allowing for:
 * - Custom registry implementations
 * - Standalone registry usage
 * - Easy testing with mock registries
 *
 * @example
 * ```typescript
 * const engine = new FormComposer()
 *   .addElement(textInputRegistration)
 *   .addElement(emailInputRegistration)
 *   .addLayout(cardLayoutRegistration)
 *   .addAction(submitActionRegistration)
 *   .build();
 * ```
 *
 * @example Custom registries
 * ```typescript
 * const customElements = new ElementRegistry();
 * customElements.register(myCustomElement);
 *
 * const engine = new FormComposer(customElements)
 *   .build();
 * ```
 */
export class FormComposer<
	TElements extends Record<string, unknown> = Record<never, unknown>,
	TLayouts extends Record<string, unknown> = Record<never, unknown>,
	TSteppers extends Record<string, unknown> = Record<never, unknown>,
	TActions extends Record<string, unknown> = Record<never, unknown>,
> {
	constructor(
		private elementRegistry = new ElementRegistry(),
		private layoutRegistry = new LayoutRegistry(),
		private stepperRegistry = new StepperRegistry(),
		private actionRegistry = new ActionRegistry<BuilderActionBaseContext, FormActionTrigger>(),
	) {}

	/**
	 * Register a single element with type inference from registration.
	 *
	 * @param registration - Element registration object with embedded type information
	 * @note If id is already registered, it will be overridden with a warning
	 *
	 * @example
	 * ```typescript
	 * builder.addElement(InputElementRegistration)
	 * ```
	 */
	addElement<T extends InputRegistration<any, any, any> | StaticRegistration<any, any, any>>(
		registration: T,
	): FormComposer<
		TElements & Record<ExtractTypeId<T>, ExtractSchemaType<T['schema']>>,
		TLayouts,
		TSteppers,
		TActions
	> {
		this.elementRegistry.register(registration);

		return this;
	}

	/**
	 * Register multiple elements at once.
	 *
	 * @param registrations - Array of element registrations
	 */
	addElements(registrations: (InputRegistration<any, any, any> | StaticRegistration<any, any, any>)[]): this {
		for (const registration of registrations) {
			this.addElement(registration);
		}
		return this;
	}

	/**
	 * Register a single layout with type inference from registration.
	 *
	 * @param registration - Layout registration object with embedded type information
	 * @note If id is already registered, it will be overridden with a warning
	 *
	 * @example
	 * ```typescript
	 * builder.addLayout(CardLayoutRegistration)
	 * ```
	 */
	addLayout<T extends LayoutRegistration<any, any, any>>(
		registration: T,
	): FormComposer<
		TElements,
		TLayouts & Record<ExtractTypeId<T>, ExtractSchemaType<T['schema']>>,
		TSteppers,
		TActions
	> {
		this.layoutRegistry.register(registration);

		return this;
	}

	/**
	 * Register multiple layouts at once.
	 *
	 * @param registrations - Array of layout registrations
	 */
	addLayouts(registrations: LayoutRegistration<any, any, any>[]): this {
		for (const registration of registrations) {
			this.addLayout(registration);
		}
		return this;
	}

	/**
	 * Register a single stepper with type inference from registration.
	 *
	 * @param registration - Stepper registration object with embedded type information
	 * @note If id is already registered, it will be overridden with a warning
	 *
	 * @example
	 * ```typescript
	 * builder.addStepper(DefaultStepperRegistration)
	 * ```
	 */
	addStepper<T extends StepperRegistration<any, any, any>>(
		registration: T,
	): FormComposer<
		TElements,
		TLayouts,
		TSteppers & Record<ExtractTypeId<T>, ExtractSchemaType<T['schema']>>,
		TActions
	> {
		this.stepperRegistry.register(registration);
		return this;
	}

	/**
	 * Register multiple steppers at once.
	 *
	 * @param registrations - Array of stepper registrations
	 */
	addSteppers(registrations: StepperRegistration<any, any, any>[]): this {
		for (const registration of registrations) {
			this.addStepper(registration);
		}
		return this;
	}

	/**
	 * Register a single action.
	 *
	 * @param registration - Action registration object
	 * @note If id is already registered, it will be overridden with a warning
	 */
	addAction<TType extends string, TConfig extends ActionConfigBase<TType>>(
		registration: BuilderActionRegistration<TType, TConfig>,
	): FormComposer<TElements, TLayouts, TSteppers, TActions & Record<TType, TConfig>> {
		this.actionRegistry.register(registration);
		return this;
	}

	/**
	 * Register multiple actions at once.
	 *
	 * @param registrations - Array of action registrations
	 */
	addActions(registrations: BuilderActionRegistration<any, any>[]): this {
		for (const registration of registrations) {
			this.addAction(registration);
		}
		return this;
	}

	/**
	 * Create a union schema from an array of schemas.
	 * Handles edge cases: empty array, single schema, and multiple schemas.
	 */
	private createUnionSchema(schemas: z.ZodTypeAny[]): z.ZodTypeAny {
		if (schemas.length === 0) {
			return z.never();
		}
		if (schemas.length === 1) {
			return schemas[0];
		}
		return z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
	}

	/**
	 * Generate a Zod schema for form configurations based on registered components.
	 * This schema can be used for runtime validation of form configs.
	 *
	 * @returns Zod schema for validating form configurations
	 */
	createFormConfigSchema() {
		const elementSchemas = this.elementRegistry.getAll().map((el) => el.schema);
		const layoutSchemas = this.layoutRegistry.getAll().map((layout) => layout.schema);
		const stepperSchemas = this.stepperRegistry.getAll().map((stepper) => stepper.schema);
		const actionSchemas = this.actionRegistry.getAll().map((action: any) => action.schema);

		const elementsUnion = this.createUnionSchema(elementSchemas);
		const layoutsUnion = this.createUnionSchema(layoutSchemas);
		const steppersUnion = this.createUnionSchema(stepperSchemas);
		const actionsUnion = this.createUnionSchema(actionSchemas);

		const formStepSchema = z.object({
			id: z.string(),
			title: z.string(),
			description: z.string().optional(),
			icon: z.string().optional(),
			layout: z.optional(layoutSchemas.length > 0 ? layoutsUnion : z.never()),
			elements: z.array(elementsUnion),
			rules: z.any().optional(),
			constraints: z.array(z.any()).optional(),
			className: z.string().optional(),
			style: z.record(z.string(), z.any()).optional(),
			onStepEnter: z.array(actionsUnion).optional(),
			onStepLeave: z.array(actionsUnion).optional(),
			onStepValidate: z.array(actionsUnion).optional(),
			actions: z.array(actionsUnion).optional(),
		});

		return z.object({
			id: z.string().describe('Unique identifier for the form'),
			title: z.string().optional().describe('Display title of the form'),
			description: z.string().optional().describe('Description of the form purpose'),
			steps: z.array(formStepSchema),
			stepper: z.optional(stepperSchemas.length > 0 ? steppersUnion : z.never()),
			grid: z.lazy(() => GridLayoutConfigSchema).optional(),
			mode: z.enum(['wizard', 'free']).optional().default('wizard'),
			validationMode: z.enum(['onSubmit', 'onChange', 'onBlur', 'all']).optional(),
			reValidateMode: z.enum(['onSubmit', 'onChange', 'onBlur']).optional(),
			className: z.string().optional(),
			style: z.record(z.string(), z.any()).optional(),
			actions: z.array(actionsUnion).optional(),
		});
	}

	/**
	 * Create a new builder by cloning this one with all current registrations.
	 * This allows for composition and creating specialized builders.
	 *
	 * @example
	 * ```typescript
	 * const baseBuilder = new FormComposer()
	 *   .addElement(InputElement)
	 *   .addElement(TextareaElement);
	 * const extendedBuilder = baseBuilder.clone()
	 *   .addAction(submitAction)
	 *   .addAction(notificationAction);
	 *
	 * const engine = extendedBuilder.build();
	 * ```
	 */
	clone(): FormComposer<TElements, TLayouts, TSteppers, TActions> {
		const newElementRegistry = new ElementRegistry();
		const newLayoutRegistry = new LayoutRegistry();
		const newStepperRegistry = new StepperRegistry();
		const newActionRegistry = new ActionRegistry<BuilderActionBaseContext, FormActionTrigger>();

		for (const item of this.elementRegistry.getAll()) {
			newElementRegistry.register(item);
		}
		for (const item of this.layoutRegistry.getAll()) {
			newLayoutRegistry.register(item);
		}
		for (const item of this.stepperRegistry.getAll()) {
			newStepperRegistry.register(item);
		}
		for (const item of this.actionRegistry.getAll()) {
			newActionRegistry.register(item);
		}

		const newBuilder = new FormComposer<TElements, TLayouts, TSteppers, TActions>(
			newElementRegistry,
			newLayoutRegistry,
			newStepperRegistry,
			newActionRegistry,
		);

		logger.debug('Cloned FormComposer', {
			elements: newBuilder.elementRegistry.size,
			layouts: newBuilder.layoutRegistry.size,
			steppers: newBuilder.stepperRegistry.size,
			actions: newBuilder.actionRegistry.size,
		});

		return newBuilder;
	}

	/**
	 * Build the immutable FormEngine instance.
	 * Creates a unified schema registry for JSON Schema generation.
	 *
	 * @returns FormEngine configured with all registered components and actions
	 */
	build(zodRegistry?: FormEngineSchemaMetadataRegistry): FormEngine<TElements, TLayouts, TSteppers, TActions> {
		logger.debug('Building FormEngine', {
			elements: this.elementRegistry.size,
			layouts: this.layoutRegistry.size,
			steppers: this.stepperRegistry.size,
			actions: this.actionRegistry.size,
		});

		const schemaRegistry = zodRegistry ?? z.registry<FormEngineSchemaMetadata>();

		this.elementRegistry.registerSchemas(schemaRegistry, (item) => ({
			id: `element:${item.$type}`,
			componentType: ComponentType.Element,
			title: item.metadata.name,
			description: item.metadata.description,
			category: item.metadata.category,
		}));

		this.layoutRegistry.registerSchemas(schemaRegistry, (item) => ({
			id: `layout:${item.$type}`,
			componentType: ComponentType.Layout,
			title: item.metadata.name,
			description: item.metadata.description,
		}));

		this.stepperRegistry.registerSchemas(schemaRegistry, (item) => ({
			id: `stepper:${item.$type}`,
			componentType: ComponentType.Stepper,
			title: item.metadata.name,
			description: item.metadata.description,
		}));

		this.actionRegistry.registerSchemas(schemaRegistry, (item) => ({
			id: `action:${item.$type}`,
			componentType: ComponentType.Action,
			title: item.metadata.name,
			description: item.metadata.description,
		}));

		const formConfigSchema = this.createFormConfigSchema();
		const actionConfigValidators = createActionConfigValidatorMap(this.actionRegistry.getAll());
		const schemaArtifacts = createFormEngineSchemaArtifacts(
			schemaRegistry,
			formConfigSchema,
			undefined,
			actionConfigValidators,
		);

		return new FormEngine({
			elements: this.elementRegistry.getMap(),
			layouts: this.layoutRegistry.getMap(),
			steppers: this.stepperRegistry.getMap(),
			actions: this.actionRegistry.getMap(),
			schemaArtifacts,
			schemaRegistry,
			formConfigSchema,
		});
	}
}
