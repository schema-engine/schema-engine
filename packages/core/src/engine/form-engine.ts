import type { ElementRegistration, LayoutRegistration, StepperRegistration, BuilderActionRegistration } from '@/types';
import { logger } from '@/lib/logger';

/**
 * Engine registries - internal storage for all registered components.
 */
export interface EngineRegistries {
	elements: Map<string, ElementRegistration<any>>;
	layouts: Map<string, LayoutRegistration<any>>;
	steppers: Map<string, StepperRegistration<any>>;
	actions: Map<string, BuilderActionRegistration<any>>;
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

	constructor(registries: EngineRegistries) {
		this.registries = {
			elements: new Map(registries.elements),
			layouts: new Map(registries.layouts),
			steppers: new Map(registries.steppers),
			actions: new Map(registries.actions),
		};

		logger.debug('FormEngine initialized', {
			elements: this.registries.elements.size,
			layouts: this.registries.layouts.size,
			steppers: this.registries.steppers.size,
			actions: this.registries.actions.size,
		});
	}

	/**
	 * Get a registered element by id.
	 */
	getElement(id: string): ElementRegistration<any> | undefined {
		return this.registries.elements.get(id);
	}

	/**
	 * Get all registered elements.
	 */
	getAllElements(): ElementRegistration[] {
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
	getLayout(id: string): LayoutRegistration<any> | undefined {
		return this.registries.layouts.get(id);
	}

	/**
	 * Get all registered layouts.
	 */
	getAllLayouts(): LayoutRegistration[] {
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
	getStepper(id: string): StepperRegistration<any> | undefined {
		return this.registries.steppers.get(id);
	}

	/**
	 * Get all registered steppers.
	 */
	getAllSteppers(): StepperRegistration[] {
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
