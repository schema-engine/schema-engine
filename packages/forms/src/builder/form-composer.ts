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
	createZodRegistryFromCatalog,
} from '@/engine/schema-artifacts';
import { SchemaMetadataCatalog } from '@/engine/schema-metadata-catalog';
import { logger } from '@/lib/logger';
import { ElementRegistry, LayoutRegistry, StepperRegistry } from '@/registries';
import { createFormConfigSchemaFromRegistries } from '@/schemas/standard-schema-composer';
import { ActionRegistry, type ActionConfigBase } from '@schema-engine/actions';
import type { StandardSchemaV1 } from '@standard-schema/spec';
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

	/** Generate a Standard Schema for form configurations based on registered components. */
	createFormConfigSchema(): StandardSchemaV1 {
		return createFormConfigSchemaFromRegistries({
			elements: this.elementRegistry.getAll(),
			layouts: this.layoutRegistry.getAll(),
			steppers: this.stepperRegistry.getAll(),
			actions: this.actionRegistry.getAll(),
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
	 * Populates a schema metadata catalog for JSON Schema generation.
	 *
	 * @returns FormEngine configured with all registered components and actions
	 */
	build(catalog?: SchemaMetadataCatalog): FormEngine<TElements, TLayouts, TSteppers, TActions> {
		logger.debug('Building FormEngine', {
			elements: this.elementRegistry.size,
			layouts: this.layoutRegistry.size,
			steppers: this.stepperRegistry.size,
			actions: this.actionRegistry.size,
		});

		const metadataCatalog = catalog ?? new SchemaMetadataCatalog();

		if (!catalog) {
			metadataCatalog.registerFromRegistry(this.elementRegistry, (item) => ({
				id: `element:${item.$type}`,
				componentType: ComponentType.Element,
				title: item.metadata.name,
				description: item.metadata.description,
				category: item.metadata.category,
			}));

			metadataCatalog.registerFromRegistry(this.layoutRegistry, (item) => ({
				id: `layout:${item.$type}`,
				componentType: ComponentType.Layout,
				title: item.metadata.name,
				description: item.metadata.description,
			}));

			metadataCatalog.registerFromRegistry(this.stepperRegistry, (item) => ({
				id: `stepper:${item.$type}`,
				componentType: ComponentType.Stepper,
				title: item.metadata.name,
				description: item.metadata.description,
			}));

			metadataCatalog.registerFromRegistry(this.actionRegistry, (item) => ({
				id: `action:${item.$type}`,
				componentType: ComponentType.Action,
				title: item.metadata.name,
				description: item.metadata.description,
			}));
		}

		const metadataRegistry = createZodRegistryFromCatalog(metadataCatalog);
		const formConfigSchema = createFormConfigSchemaFromRegistries(
			{
				elements: this.elementRegistry.getAll(),
				layouts: this.layoutRegistry.getAll(),
				steppers: this.stepperRegistry.getAll(),
				actions: this.actionRegistry.getAll(),
			},
			metadataRegistry,
		);
		const actionConfigValidators = createActionConfigValidatorMap(this.actionRegistry.getAll());
		const schemaArtifacts = createFormEngineSchemaArtifacts(
			metadataCatalog,
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
			formConfigSchema,
		});
	}

	static fromEngine<
		TElements extends Record<string, unknown> = Record<never, unknown>,
		TLayouts extends Record<string, unknown> = Record<never, unknown>,
		TSteppers extends Record<string, unknown> = Record<never, unknown>,
		TActions extends Record<string, unknown> = Record<never, unknown>,
	>(
		engine: FormEngine<TElements, TLayouts, TSteppers, TActions>,
	): FormComposer<TElements, TLayouts, TSteppers, TActions> {
		const elementRegistry = new ElementRegistry();
		const layoutRegistry = new LayoutRegistry();
		const stepperRegistry = new StepperRegistry();
		const actionRegistry = new ActionRegistry<BuilderActionBaseContext, FormActionTrigger>();

		for (const value of engine.getAllElements()) {
			elementRegistry.register(value);
		}
		for (const value of engine.getAllLayouts()) {
			layoutRegistry.register(value);
		}
		for (const value of engine.getAllSteppers()) {
			stepperRegistry.register(value);
		}
		for (const value of engine.getAllActions()) {
			actionRegistry.register(value);
		}

		return new FormComposer<TElements, TLayouts, TSteppers, TActions>(
			elementRegistry,
			layoutRegistry,
			stepperRegistry,
			actionRegistry,
		);
	}
}
