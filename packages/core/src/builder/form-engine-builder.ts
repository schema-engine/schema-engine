import type { ElementRegistration, LayoutRegistration, StepperRegistration, BuilderActionRegistration } from '@/types';
import { logger } from '@/lib/logger';

/**
 * FormEngineBuilder - Builder pattern for configuring the form engine.
 *
 * Provides a fluent API for registering elements, layouts, steppers, and actions.
 * Once configured, calling `build()` creates an immutable FormEngine instance.
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
 */
export class FormEngineBuilder<
	TElements extends Record<string, unknown> = Record<string, never>,
	TLayouts extends Record<string, unknown> = Record<string, never>,
	TSteppers extends Record<string, unknown> = Record<string, never>,
	TActions extends Record<string, unknown> = Record<string, never>,
> {
	private elements = new Map<string, ElementRegistration<any>>();
	private layouts = new Map<string, LayoutRegistration<any>>();
	private steppers = new Map<string, StepperRegistration<any>>();
	private actions = new Map<string, BuilderActionRegistration<any>>();

	/**
	 * Register a single element.
	 *
	 * @param registration - Element registration object
	 * @throws Error if componentId is already registered
	 */
	addElement<TConfig>(
		registration: ElementRegistration<TConfig>,
	): FormEngineBuilder<
		TElements & { [K in typeof registration.componentId]: TConfig },
		TLayouts,
		TSteppers,
		TActions
	> {
		if (this.elements.has(registration.componentId)) {
			throw new Error(`Element with componentId "${registration.componentId}" is already registered`);
		}

		this.elements.set(registration.componentId, registration);
		logger.debug(`Registered element: ${registration.componentId}`, {
			category: registration.metadata.category,
			name: registration.metadata.name,
		});

		return this as unknown as FormEngineBuilder<
			TElements & { [K in typeof registration.componentId]: TConfig },
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
	 * @throws Error if layoutId is already registered
	 */
	addLayout<TConfig>(
		registration: LayoutRegistration<TConfig>,
	): FormEngineBuilder<TElements, TLayouts & { [K in typeof registration.layoutId]: TConfig }, TSteppers, TActions> {
		if (this.layouts.has(registration.layoutId)) {
			throw new Error(`Layout with layoutId "${registration.layoutId}" is already registered`);
		}

		this.layouts.set(registration.layoutId, registration);
		logger.debug(`Registered layout: ${registration.layoutId}`, {
			name: registration.metadata.name,
		});

		return this as unknown as FormEngineBuilder<
			TElements,
			TLayouts & { [K in typeof registration.layoutId]: TConfig },
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
	 * @throws Error if stepperId is already registered
	 */
	addStepper<TConfig>(
		registration: StepperRegistration<TConfig>,
	): FormEngineBuilder<TElements, TLayouts, TSteppers & { [K in typeof registration.stepperId]: TConfig }, TActions> {
		if (this.steppers.has(registration.stepperId)) {
			throw new Error(`Stepper with stepperId "${registration.stepperId}" is already registered`);
		}

		this.steppers.set(registration.stepperId, registration);
		logger.debug(`Registered stepper: ${registration.stepperId}`, {
			name: registration.metadata.name,
		});

		return this as unknown as FormEngineBuilder<
			TElements,
			TLayouts,
			TSteppers & { [K in typeof registration.stepperId]: TConfig },
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
	 * @throws Error if actionType is already registered
	 */
	addAction<TConfig>(
		registration: BuilderActionRegistration<TConfig>,
	): FormEngineBuilder<
		TElements,
		TLayouts,
		TSteppers,
		TActions & { [K in typeof registration.actionType]: TConfig }
	> {
		if (this.actions.has(registration.actionType)) {
			throw new Error(`Action with actionType "${registration.actionType}" is already registered`);
		}

		this.actions.set(registration.actionType, registration);
		logger.debug(`Registered action: ${registration.actionType}`, {
			name: registration.metadata.name,
		});

		return this as unknown as FormEngineBuilder<
			TElements,
			TLayouts,
			TSteppers,
			TActions & { [K in typeof registration.actionType]: TConfig }
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
	 * Build the immutable FormEngine instance.
	 *
	 * @returns FormEngine configured with all registered components and actions
	 */
	build() {
		logger.debug('Building FormEngine', {
			elements: this.elements.size,
			layouts: this.layouts.size,
			steppers: this.steppers.size,
			actions: this.actions.size,
		});

		// Import FormEngine dynamically to avoid circular dependency
		const { FormEngine: FormEngineClass } = require('@/engine/form-engine');

		return new FormEngineClass({
			elements: this.elements,
			layouts: this.layouts,
			steppers: this.steppers,
			actions: this.actions,
		});
	}
}
