import type {
	InputRegistration,
	StaticRegistration,
	LayoutRegistration,
	StepperRegistration,
	BuilderActionRegistration,
} from '@/types';
import type { FormEngineSchemaMetadata } from '@/engine/form-engine';
import { logger } from '@/lib/logger';
import { ElementRegistry, LayoutRegistry, StepperRegistry, ActionRegistry } from '@/registries';
import { FormConfigBuilder } from './form-config-builder';
import { z } from 'zod';
import type { Merge, ExtractSchemaType, ExtractTypeId } from './type-utils';

/**
 * FormEngineBuilder - Builder pattern for configuring the form engine.
 *
 * Provides a fluent API for registering elements, layouts, steppers, and actions.
 * Once configured, calling `build()` creates an immutable FormEngine instance.
 *
 * Registries are injected as dependencies (with defaults), allowing for:
 * - Custom registry implementations
 * - Standalone registry usage
 * - Easy testing with mock registries
 *
 * @example
 * ```typescript
 * const engine = new FormEngineBuilder()
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
 * const engine = new FormEngineBuilder(customElements)
 *   .build();
 * ```
 */
export class FormEngineBuilder<
	TElements extends Record<string, unknown> = Record<string, never>,
	TLayouts extends Record<string, unknown> = Record<string, never>,
	TSteppers extends Record<string, unknown> = Record<string, never>,
	TActions extends Record<string, unknown> = Record<string, never>,
> {
	constructor(
		private elementRegistry = new ElementRegistry(),
		private layoutRegistry = new LayoutRegistry(),
		private stepperRegistry = new StepperRegistry(),
		private actionRegistry = new ActionRegistry(),
	) {}

	/**
	 * Register a single element with type inference from registration.
	 *
	 * @param registration - Element registration object with embedded type information
	 * @note If id is already registered, it will be overridden with a warning
	 *
	 * @example
	 * ```typescript
	 * // Type inferred from registration's $type property
	 * builder.addElement(InputElementRegistration)
	 * ```
	 */
	addElement<T extends InputRegistration<any, any, any> | StaticRegistration<any, any, any>>(
		registration: T,
	): FormEngineBuilder<
		TElements & Record<ExtractTypeId<T>, ExtractSchemaType<T['schema']>>,
		TLayouts,
		TSteppers,
		TActions
	>;
	addElement<T extends InputRegistration<any, any, any> | StaticRegistration<any, any, any>>(
		registration: T,
	): FormEngineBuilder<
		TElements & Record<ExtractTypeId<T>, ExtractSchemaType<T['schema']>>,
		TLayouts,
		TSteppers,
		TActions
	> {
		this.elementRegistry.register(registration);

		return this as any;
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
	): FormEngineBuilder<
		TElements,
		TLayouts & Record<ExtractTypeId<T>, ExtractSchemaType<T['schema']>>,
		TSteppers,
		TActions
	>;
	addLayout<T extends LayoutRegistration<any, any, any>>(
		registration: T,
	): FormEngineBuilder<
		TElements,
		TLayouts & Record<ExtractTypeId<T>, ExtractSchemaType<T['schema']>>,
		TSteppers,
		TActions
	> {
		this.layoutRegistry.register(registration);

		return this as any;
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
	): FormEngineBuilder<
		TElements,
		TLayouts,
		TSteppers & Record<ExtractTypeId<T>, ExtractSchemaType<T['schema']>>,
		TActions
	>;
	addStepper<T extends StepperRegistration<any, any, any>>(
		registration: T,
	): FormEngineBuilder<
		TElements,
		TLayouts,
		TSteppers & Record<ExtractTypeId<T>, ExtractSchemaType<T['schema']>>,
		TActions
	> {
		this.stepperRegistry.register(registration);
		return this as any;
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
	addAction<T extends BuilderActionRegistration<any>>(
		registration: T,
	): FormEngineBuilder<
		TElements,
		TLayouts,
		TSteppers,
		T extends BuilderActionRegistration<infer C>
			? Merge<
					TActions,
					{
						[K in T['$type']]: Omit<C, '$type'>;
					}
				>
			: TActions
	> {
		this.actionRegistry.register(registration);
		return this as any;
	}

	/**
	 * Register multiple actions at once.
	 *
	 * @param registrations - Array of action registrations
	 */
	addActions(registrations: BuilderActionRegistration<any>[]): this {
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
	 * Create a typed form configuration builder.
	 * Provides a fluent API for building form configurations with type safety and validation.
	 *
	 * @example
	 * ```typescript
	 * const builder = new FormEngineBuilder()
	 *   .addElement(inputRegistration)
	 *   .addStepper(wizardStepperRegistration);
	 *
	 * const formConfig = builder.createForm()
	 *   .setId('contact-form')
	 *   .setTitle('Contact Us')
	 *   .addStep({ id: 'step-1', title: 'Personal Info' })
	 *   .addElement('input', { id: 'name', name: 'name', label: 'Name' })
	 *   .addStepAction('submit', { url: '/api/submit' })
	 *   .setStepper('wizard')
	 *   .build();
	 * ```
	 *
	 * @returns A FormConfigBuilder that uses the augmented FormEngine namespace for type inference
	 */
	createForm(): FormConfigBuilder<TElements, TLayouts, TSteppers, TActions> {
		return new FormConfigBuilder<TElements, TLayouts, TSteppers, TActions>(
			this.elementRegistry,
			this.layoutRegistry,
			this.stepperRegistry,
			this.actionRegistry,
		);
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
		const actionSchemas = this.actionRegistry.getAll().map((action) => action.schema);

		const elementsUnion = this.createUnionSchema(elementSchemas);
		const layoutsUnion = this.createUnionSchema(layoutSchemas);
		const steppersUnion = this.createUnionSchema(stepperSchemas);
		const actionsUnion = this.createUnionSchema(actionSchemas);

		return z.object({
			id: z.string().describe('Unique identifier for the form'),
			title: z.string().optional().describe('Display title of the form'),
			description: z.string().optional().describe('Description of the form purpose'),
			elements: z.array(elementsUnion).min(1).describe('Array of form elements to render'),
			layout: layoutSchemas.length > 0 ? layoutsUnion.optional() : z.object({}).optional(),
			stepper: stepperSchemas.length > 0 ? steppersUnion.optional() : z.object({}).optional(),
			actions: actionSchemas.length > 0 ? z.array(actionsUnion).optional() : z.array(z.object({})).optional(),
			metadata: z.object({}).catchall(z.unknown()).optional().describe('Additional metadata for the form'),
		});
	}

	/**
	 * Create a new builder extending this one with additional registrations.
	 * This allows for composition and creating specialized builders.
	 *
	 * @example
	 * ```typescript
	 * const baseEngine = new FormEngineBuilder()
	 *   .addElement(InputElement)
	 *   .addElement(TextareaElement)
	 *   .build();
	 *
	 * // Later, extend with actions
	 * const extendedEngine = baseEngine.extend()
	 *   .addAction(submitAction)
	 *   .addAction(notificationAction)
	 *   .build();
	 * ```
	 */
	extend(): FormEngineBuilder<TElements, TLayouts, TSteppers, TActions> {
		const newElementRegistry = new ElementRegistry();
		const newLayoutRegistry = new LayoutRegistry();
		const newStepperRegistry = new StepperRegistry();
		const newActionRegistry = new ActionRegistry();

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

		const newBuilder = new FormEngineBuilder<TElements, TLayouts, TSteppers, TActions>(
			newElementRegistry,
			newLayoutRegistry,
			newStepperRegistry,
			newActionRegistry,
		);

		logger.debug('Extended FormEngineBuilder', {
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
	build(): import('@/engine/form-engine').FormEngine<TElements, TLayouts, TSteppers, TActions> {
		logger.debug('Building FormEngine', {
			elements: this.elementRegistry.size,
			layouts: this.layoutRegistry.size,
			steppers: this.stepperRegistry.size,
			actions: this.actionRegistry.size,
		});

		const schemaRegistry = z.registry<FormEngineSchemaMetadata>();

		for (const element of this.elementRegistry.getAll()) {
			element.schema.register(schemaRegistry, {
				id: `element:${element.$type}`,
				componentType: 'element',
				title: element.metadata.name,
				description: element.metadata.description,
				category: element.metadata.category,
			});
		}

		for (const layout of this.layoutRegistry.getAll()) {
			layout.schema.register(schemaRegistry, {
				id: `layout:${layout.$type}`,
				componentType: 'layout',
				title: layout.metadata.name,
				description: layout.metadata.description,
			});
		}

		for (const stepper of this.stepperRegistry.getAll()) {
			stepper.schema.register(schemaRegistry, {
				id: `stepper:${stepper.$type}`,
				componentType: 'stepper',
				title: stepper.metadata.name,
				description: stepper.metadata.description,
			});
		}

		for (const action of this.actionRegistry.getAll()) {
			action.schema.register(schemaRegistry, {
				id: `action:${action.$type}`,
				componentType: 'action',
				title: action.metadata.name,
				description: action.metadata.description,
			});
		}

		const formConfigSchema = this.createFormConfigSchema();

		const { FormEngine: FormEngineClass } = require('@/engine/form-engine');

		return new FormEngineClass({
			elements: this.elementRegistry.getMap(),
			layouts: this.layoutRegistry.getMap(),
			steppers: this.stepperRegistry.getMap(),
			actions: this.actionRegistry.getMap(),
			schemaRegistry,
			formConfigSchema,
		}) as import('@/engine/form-engine').FormEngine<TElements, TLayouts, TSteppers, TActions>;
	}
}
