import { logger } from '@/lib/logger';
import type { ElementRegistry, LayoutRegistry, StepperRegistry } from '@/registries';
import type { ActionRegistry } from '@schema-engine/actions';
import type { FormConfig } from '@/schemas/form-config';
import type { PartialFormConfig, BuilderFormStep } from './types';
import type { BuilderActionExecutionContext } from '@/types';
import type { FormActionTrigger } from '@/actions/triggers';
import { z } from 'zod';

/**
 * FormConfigBuilder - Fluent API for creating typed form configurations.
 *
 * Provides a type-safe, chainable interface for building form configurations
 * that are validated against the registered schemas.
 *
 * @example
 * ```typescript
 * const builder = new FormEngineBuilder()
 *   .addElement(inputRegistration)
 *   .addStepper(wizardStepperRegistration)
 *   .addAction(submitActionRegistration);
 *
 * const formConfig = builder.createForm()
 *   .setId('contact-form')
 *   .setTitle('Contact Us')
 *   .addStep({ id: 'step-1', title: 'Personal Info' })
 *   .addElement('input', { id: 'name', name: 'name', label: 'Name' })
 *   .addElement('input', { id: 'email', name: 'email', label: 'Email', inputType: 'email' })
 *   .addStepAction('submit', { url: '/api/submit' })
 *   .setStepper('wizard')
 *   .build();
 * ```
 */
export class FormConfigBuilder<
	TElements extends Record<string, unknown> = Record<never, unknown>,
	TLayouts extends Record<string, unknown> = Record<never, unknown>,
	TSteppers extends Record<string, unknown> = Record<never, unknown>,
	TActions extends Record<string, unknown> = Record<never, unknown>,
> {
	private config: PartialFormConfig;
	private currentStep: BuilderFormStep | null = null;

	constructor(
		private elementRegistry: ElementRegistry,
		private layoutRegistry: LayoutRegistry,
		private stepperRegistry: StepperRegistry,
		private actionRegistry: ActionRegistry<BuilderActionExecutionContext, FormActionTrigger>,
	) {
		this.config = {
			steps: [],
		};
	}

	/**
	 * Set the unique identifier for the form.
	 *
	 * @param id - Unique form identifier
	 */
	setId(id: string): this {
		this.config.id = id;
		return this;
	}

	/**
	 * Set the display title for the form.
	 *
	 * @param title - Form title
	 */
	setTitle(title: string): this {
		this.config.title = title;
		return this;
	}

	/**
	 * Set the description for the form.
	 *
	 * @param description - Form description
	 */
	setDescription(description: string): this {
		this.config.description = description;
		return this;
	}

	/**
	 * Set the form mode (wizard or free).
	 *
	 * @param mode - Form mode
	 */
	setMode(mode: 'wizard' | 'free'): this {
		this.config.mode = mode;
		return this;
	}

	/**
	 * Set the validation mode for the form.
	 *
	 * @param mode - When to trigger validation (onSubmit, onChange, onBlur, or all)
	 */
	setValidationMode(mode: 'onSubmit' | 'onChange' | 'onBlur' | 'all'): this {
		this.config.validationMode = mode;
		return this;
	}

	/**
	 * Set the revalidation mode for the form.
	 *
	 * @param mode - When to trigger revalidation after initial validation (onSubmit, onChange, or onBlur)
	 */
	setReValidateMode(mode: 'onSubmit' | 'onChange' | 'onBlur'): this {
		this.config.reValidateMode = mode;
		return this;
	}

	/**
	 * Set the grid configuration for the form.
	 *
	 * @param grid - Grid layout configuration
	 */
	setGrid(grid: import('@/schemas/base-field').GridLayoutConfig): this {
		this.config.grid = grid;
		return this;
	}

	/**
	 * Set the CSS class name for the form.
	 *
	 * @param className - CSS class name
	 */
	setClassName(className: string): this {
		this.config.className = className;
		return this;
	}

	/**
	 * Set the inline styles for the form.
	 *
	 * @param style - Inline style object
	 */
	setStyle(style: Record<string, any>): this {
		this.config.style = style;
		return this;
	}

	/**
	 * Add a new step to the form.
	 * This becomes the current step where elements will be added.
	 *
	 * @param step - Step configuration
	 */
	addStep(step: { id: string; title: string; description?: string; icon?: string }): this {
		this.currentStep = {
			id: step.id,
			title: step.title,
			description: step.description,
			icon: step.icon,
			elements: [],
		};
		this.config.steps.push(this.currentStep);

		logger.debug(`Added step: ${step.id}`, { step });
		return this;
	}

	/**
	 * Add an element to the current step.
	 *
	 * @param id - Element type identifier
	 * @param config - Element configuration (validated against registration schema)
	 * @throws Error if no step is active or element type is not registered or config is invalid
	 */
	addElement<K extends keyof TElements & string>(id: K, config: TElements[K]): this {
		if (!this.currentStep) {
			throw new Error('Must call addStep() before adding elements');
		}
		const registration = this.elementRegistry.get(id);

		if (!registration) {
			throw new Error(`Element type "${id}" is not registered`);
		}

		try {
			const validated = registration.schema.parse({ ...(config as object), $type: id });
			this.currentStep.elements.push(validated as FormEngine.ElementConfig);

			logger.debug(`Added element: ${id}`, { config: validated });
		} catch (error) {
			if (error instanceof z.ZodError) {
				logger.error(`Invalid config for element "${id}"`, { errors: error.issues });
				throw new Error(
					`Invalid configuration for element "${id}": ${error.issues.map((e) => e.message).join(', ')}`,
					{ cause: error },
				);
			}
			throw error;
		}
		return this;
	}

	/**
	 * Set the layout for the current step.
	 *
	 * @param id - Layout type identifier
	 * @param config - Layout configuration (validated against registration schema)
	 * @throws Error if no step is active or layout type is not registered or config is invalid
	 */
	setStepLayout<K extends keyof TLayouts & string>(id: K, config: TLayouts[K]): this {
		if (!this.currentStep) {
			throw new Error('Must call addStep() before setting layout');
		}

		const registration = this.layoutRegistry.get(id);

		if (!registration) {
			throw new Error(`Layout type "${id}" is not registered`);
		}

		try {
			const validated = registration.schema.parse({ ...(config as object), $type: id });
			this.currentStep.layout = validated as FormEngine.LayoutConfig;

			logger.debug(`Set step layout: ${id}`, { config: validated });
		} catch (error) {
			if (error instanceof z.ZodError) {
				logger.error(`Invalid config for layout "${id}"`, { errors: error.issues });
				throw new Error(
					`Invalid configuration for layout "${id}": ${error.issues.map((e) => e.message).join(', ')}`,
					{ cause: error },
				);
			}
			throw error;
		}
		return this;
	}

	/**
	 * Set the stepper for the form.
	 *
	 * @param id - Stepper type identifier
	 * @param config - Stepper configuration (validated against registration schema)
	 * @throws Error if stepper type is not registered or config is invalid
	 */
	setStepper<K extends keyof TSteppers & string>(id: K, config?: TSteppers[K]): this {
		const registration = this.stepperRegistry.get(id);

		if (!registration) {
			throw new Error(`Stepper type "${id}" is not registered`);
		}

		try {
			const validated = registration.schema.parse({ ...(config as object), $type: id });
			this.config.stepper = validated as FormEngine.StepperConfig;

			logger.debug(`Set stepper: ${id}`, { config: validated });
		} catch (error) {
			if (error instanceof z.ZodError) {
				logger.error(`Invalid config for stepper "${id}"`, { errors: error.issues });
				throw new Error(
					`Invalid configuration for stepper "${id}": ${error.issues.map((e) => e.message).join(', ')}`,
					{ cause: error },
				);
			}
			throw error;
		}
		return this;
	}

	/**
	 * Add an action to the current step.
	 *
	 * @param type - Action type identifier
	 * @param config - Action configuration (validated against registration schema)
	 * @throws Error if no step is active or action type is not registered or config is invalid
	 */
	addStepAction<K extends keyof TActions & string>(type: K, config: TActions[K]): this {
		if (!this.currentStep) {
			throw new Error('Must call addStep() before adding step actions');
		}

		const registration = this.actionRegistry.getAction(type);

		if (!registration?.schema) {
			throw new Error(`Action type "${type}" is not registered`);
		}

		try {
			const validated = registration.schema.parse({ ...(config as object), $type: type });

			if (!this.currentStep.actions) {
				this.currentStep.actions = [];
			}
			this.currentStep.actions.push(validated as any);

			logger.debug(`Added step action: ${type}`, { config: validated });
		} catch (error) {
			if (error instanceof z.ZodError) {
				logger.error(`Invalid config for action "${type}"`, { errors: error.issues });
				throw new Error(
					`Invalid configuration for action "${type}": ${error.issues.map((e) => e.message).join(', ')}`,
					{ cause: error },
				);
			}
			throw error;
		}
		return this;
	}

	/**
	 * Add an action to the form level.
	 *
	 * @param type - Action type identifier
	 * @param config - Action configuration (validated against registration schema)
	 * @throws Error if action type is not registered or config is invalid
	 */
	addFormAction<K extends keyof TActions & string>(type: K, config: Omit<TActions[K], '$type'>): this {
		const registration = this.actionRegistry.getAction(type);

		if (!registration || !registration.schema) {
			throw new Error(`Action type "${type}" is not registered`);
		}

		try {
			const validated = registration.schema.parse({ ...(config as object), $type: type });

			if (!this.config.actions) {
				this.config.actions = [];
			}
			this.config.actions.push(validated as any);

			logger.debug(`Added form action: ${type}`, { config: validated });
		} catch (error) {
			if (error instanceof z.ZodError) {
				logger.error(`Invalid config for action "${type}"`, { errors: error.issues });
				throw new Error(
					`Invalid configuration for action "${type}": ${error.issues.map((e) => e.message).join(', ')}`,
					{ cause: error },
				);
			}
			throw error;
		}
		return this;
	}

	/**
	 * Build and return the final form configuration.
	 *
	 * @returns The validated form configuration object
	 * @throws Error if required fields are missing
	 */
	build(): FormConfig {
		if (!this.config.id) {
			throw new Error('Form ID is required. Call setId() before building.');
		}

		if (this.config.steps.length === 0) {
			throw new Error('At least one step is required. Call addStep() before building.');
		}

		const totalElements = this.config.steps.reduce((sum, step) => sum + step.elements.length, 0);

		const totalStepActions = this.config.steps.reduce((sum, step) => sum + (step.actions?.length || 0), 0);

		logger.debug('Built form configuration', {
			id: this.config.id,
			stepCount: this.config.steps.length,
			totalElements,
			hasStepper: !!this.config.stepper,
			mode: this.config.mode || 'wizard',
			formActions: this.config.actions?.length || 0,
			stepActions: totalStepActions,
		});

		return {
			id: this.config.id,
			title: this.config.title,
			description: this.config.description,
			steps: this.config.steps as any,
			mode: this.config.mode || 'wizard',
			stepper: this.config.stepper as any,
			actions: this.config.actions,
			validationMode: this.config.validationMode,
			reValidateMode: this.config.reValidateMode,
			grid: this.config.grid,
			className: this.config.className,
			style: this.config.style,
		};
	}
}
