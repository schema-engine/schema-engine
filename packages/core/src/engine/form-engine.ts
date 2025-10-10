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
	 * Get a registered element by componentId.
	 */
	getElement(componentId: string): ElementRegistration<any> | undefined {
		return this.registries.elements.get(componentId);
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
	hasElement(componentId: string): boolean {
		return this.registries.elements.has(componentId);
	}

	/**
	 * Get a registered layout by layoutId.
	 */
	getLayout(layoutId: string): LayoutRegistration<any> | undefined {
		return this.registries.layouts.get(layoutId);
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
	hasLayout(layoutId: string): boolean {
		return this.registries.layouts.has(layoutId);
	}

	/**
	 * Get a registered stepper by stepperId.
	 */
	getStepper(stepperId: string): StepperRegistration<any> | undefined {
		return this.registries.steppers.get(stepperId);
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
	hasStepper(stepperId: string): boolean {
		return this.registries.steppers.has(stepperId);
	}

	/**
	 * Get a registered action by actionType.
	 */
	getAction(actionType: string): BuilderActionRegistration<any> | undefined {
		return this.registries.actions.get(actionType);
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
	hasAction(actionType: string): boolean {
		return this.registries.actions.has(actionType);
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
}
