import type { ElementRegistration, LayoutRegistration, StepperRegistration, BuilderActionRegistration } from '@/types';
import type { FormEngineSchemaMetadata } from '@/engine/form-engine';
import { logger } from '@/lib/logger';
import { ElementRegistry, LayoutRegistry, StepperRegistry, ActionRegistry } from '@/registries';
import { z } from 'zod';

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
	 * Register a single element.
	 *
	 * @param registration - Element registration object
	 * @note If id is already registered, it will be overridden with a warning
	 */
	addElement<TConfig>(
		registration: ElementRegistration<TConfig>,
	): FormEngineBuilder<TElements & { [K in typeof registration.__id]: TConfig }, TLayouts, TSteppers, TActions> {
		this.elementRegistry.register(registration);

		return this as unknown as FormEngineBuilder<
			TElements & { [K in typeof registration.__id]: TConfig },
			TLayouts,
			TSteppers,
			TActions
		>;
	}

	/**
	 * Register multiple elements at once.
	 *
	 * @param registrations - Array of element registrations
	 */
	addElements(registrations: ElementRegistration[]): this {
		for (const registration of registrations) {
			this.addElement(registration);
		}
		return this;
	}

	/**
	 * Register a single layout.
	 *
	 * @param registration - Layout registration object
	 * @note If id is already registered, it will be overridden with a warning
	 */
	addLayout<TConfig>(
		registration: LayoutRegistration<TConfig>,
	): FormEngineBuilder<TElements, TLayouts & { [K in typeof registration.__id]: TConfig }, TSteppers, TActions> {
		this.layoutRegistry.register(registration);

		return this as unknown as FormEngineBuilder<
			TElements,
			TLayouts & { [K in typeof registration.__id]: TConfig },
			TSteppers,
			TActions
		>;
	}

	/**
	 * Register multiple layouts at once.
	 *
	 * @param registrations - Array of layout registrations
	 */
	addLayouts(registrations: LayoutRegistration[]): this {
		for (const registration of registrations) {
			this.addLayout(registration);
		}
		return this;
	}

	/**
	 * Register a single stepper.
	 *
	 * @param registration - Stepper registration object
	 * @note If id is already registered, it will be overridden with a warning
	 */
	addStepper<TConfig>(
		registration: StepperRegistration<TConfig>,
	): FormEngineBuilder<TElements, TLayouts, TSteppers & { [K in typeof registration.__id]: TConfig }, TActions> {
		this.stepperRegistry.register(registration);

		return this as unknown as FormEngineBuilder<
			TElements,
			TLayouts,
			TSteppers & { [K in typeof registration.__id]: TConfig },
			TActions
		>;
	}

	/**
	 * Register multiple steppers at once.
	 *
	 * @param registrations - Array of stepper registrations
	 */
	addSteppers(registrations: StepperRegistration[]): this {
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
	addAction<TConfig>(
		registration: BuilderActionRegistration<TConfig>,
	): FormEngineBuilder<TElements, TLayouts, TSteppers, TActions & { [K in typeof registration.__id]: TConfig }> {
		this.actionRegistry.register(registration);

		return this as unknown as FormEngineBuilder<
			TElements,
			TLayouts,
			TSteppers,
			TActions & { [K in typeof registration.__id]: TConfig }
		>;
	}

	/**
	 * Register multiple actions at once.
	 *
	 * @param registrations - Array of action registrations
	 */
	addActions(registrations: BuilderActionRegistration[]): this {
		for (const registration of registrations) {
			this.addAction(registration);
		}
		return this;
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
				id: `element:${element.__id}`,
				componentType: 'element',
				title: element.metadata.name,
				description: element.metadata.description,
				category: element.metadata.category,
			});
		}

		for (const layout of this.layoutRegistry.getAll()) {
			layout.schema.register(schemaRegistry, {
				id: `layout:${layout.__id}`,
				componentType: 'layout',
				title: layout.metadata.name,
				description: layout.metadata.description,
			});
		}

		for (const stepper of this.stepperRegistry.getAll()) {
			stepper.schema.register(schemaRegistry, {
				id: `stepper:${stepper.__id}`,
				componentType: 'stepper',
				title: stepper.metadata.name,
				description: stepper.metadata.description,
			});
		}

		for (const action of this.actionRegistry.getAll()) {
			action.schema.register(schemaRegistry, {
				id: `action:${action.__id}`,
				componentType: 'action',
				title: action.metadata.name,
				description: action.metadata.description,
			});
		}

		const elementSchemas = this.elementRegistry.getAll().map((el) => el.schema);
		const layoutSchemas = this.layoutRegistry.getAll().map((layout) => layout.schema);
		const stepperSchemas = this.stepperRegistry.getAll().map((stepper) => stepper.schema);
		const actionSchemas = this.actionRegistry.getAll().map((action) => action.schema);

		const elementsUnion =
			elementSchemas.length > 0
				? elementSchemas.length === 1
					? elementSchemas[0]
					: z.union(elementSchemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]])
				: z.never();

		const layoutsUnion =
			layoutSchemas.length > 0
				? layoutSchemas.length === 1
					? layoutSchemas[0]
					: z.union(layoutSchemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]])
				: z.never();

		const steppersUnion =
			stepperSchemas.length > 0
				? stepperSchemas.length === 1
					? stepperSchemas[0]
					: z.union(stepperSchemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]])
				: z.never();

		const actionsUnion =
			actionSchemas.length > 0
				? actionSchemas.length === 1
					? actionSchemas[0]
					: z.union(actionSchemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]])
				: z.never();

		const formConfigSchema = z.object({
			id: z.string().describe('Unique identifier for the form'),
			title: z.string().optional().describe('Display title of the form'),
			description: z.string().optional().describe('Description of the form purpose'),
			elements: z.array(elementsUnion).min(1).describe('Array of form elements to render'),
			layout: layoutSchemas.length > 0 ? layoutsUnion.optional() : z.object({}).optional(),
			stepper: stepperSchemas.length > 0 ? steppersUnion.optional() : z.object({}).optional(),
			actions: actionSchemas.length > 0 ? z.array(actionsUnion).optional() : z.array(z.object({})).optional(),
			metadata: z.object({}).catchall(z.unknown()).optional().describe('Additional metadata for the form'),
		});

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
