import { logger } from '@/lib/logger';
import type { ElementRegistry, RecipeRegistry } from '@/registries';
import type { ActionRegistry } from '@schema-engine/actions';
import type { FormConfig } from '@/schemas/form-config';
import type { PartialFormConfig, BuilderFormStep } from './types';
import type { BuilderActionBaseContext } from '@/types';
import type { FormActionTrigger } from '@/actions/triggers';
import { validateRegistrationConfig } from '@/lib/standard-schema';

/**
 * FormConfigBuilder - Fluent API for creating typed form configurations.
 */
export class FormConfigBuilder<
	TElements extends Record<string, unknown> = Record<never, unknown>,
	TRecipes extends Record<string, unknown> = Record<never, unknown>,
	TActions extends Record<string, unknown> = Record<never, unknown>,
> {
	private config: PartialFormConfig;
	private currentStep: BuilderFormStep | null = null;

	constructor(
		private elementRegistry: ElementRegistry,
		private recipeRegistry: RecipeRegistry,
		private actionRegistry: ActionRegistry<BuilderActionBaseContext, FormActionTrigger>,
	) {
		this.config = {
			steps: [],
		};
	}

	setId(id: string): this {
		this.config.id = id;
		return this;
	}

	setTitle(title: string): this {
		this.config.title = title;
		return this;
	}

	setDescription(description: string): this {
		this.config.description = description;
		return this;
	}

	setValidationMode(mode: 'onSubmit' | 'onChange' | 'onBlur' | 'all'): this {
		this.config.validationMode = mode;
		return this;
	}

	setReValidateMode(mode: 'onSubmit' | 'onChange' | 'onBlur'): this {
		this.config.reValidateMode = mode;
		return this;
	}

	setGrid(grid: import('@/schemas/base-field').GridLayoutConfig): this {
		this.config.grid = grid;
		return this;
	}

	setClassName(className: string): this {
		this.config.className = className;
		return this;
	}

	setStyle(style: Record<string, any>): this {
		this.config.style = style;
		return this;
	}

	/**
	 * Set the form view (recipe selection and slot configuration).
	 */
	setView<K extends keyof TRecipes & string>(id: K, config: TRecipes[K]): this {
		const registration = this.recipeRegistry.get(id);

		if (!registration) {
			throw new Error(`Recipe "${id}" is not registered`);
		}

		try {
			const validated = validateRegistrationConfig(registration.schema, {
				...(config as object),
				$type: id,
			});
			this.config.view = validated as FormEngine.ViewConfig;
			logger.debug(`Set view: ${id}`, { config: validated });
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Validation failed';
			logger.error(`Invalid config for recipe "${id}"`, { message });
			throw new Error(`Invalid configuration for recipe "${id}": ${message}`, { cause: error });
		}
		return this;
	}

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

	addElement<K extends keyof TElements & string>(id: K, config: TElements[K]): this {
		if (!this.currentStep) {
			throw new Error('Must call addStep() before adding elements');
		}
		const registration = this.elementRegistry.get(id);

		if (!registration) {
			throw new Error(`Element type "${id}" is not registered`);
		}

		try {
			const validated = validateRegistrationConfig(registration.schema, {
				...(config as object),
				$type: id,
			});
			this.currentStep.elements.push(validated as FormEngine.ElementConfig);
			logger.debug(`Added element: ${id}`, { config: validated });
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Validation failed';
			logger.error(`Invalid config for element "${id}"`, { message });
			throw new Error(`Invalid configuration for element "${id}": ${message}`, { cause: error });
		}
		return this;
	}

	addStepAction<K extends keyof TActions & string>(type: K, config: TActions[K]): this {
		if (!this.currentStep) {
			throw new Error('Must call addStep() before adding step actions');
		}

		const registration = this.actionRegistry.getAction(type);

		if (!registration?.schema) {
			throw new Error(`Action type "${type}" is not registered`);
		}

		try {
			const validated = validateRegistrationConfig(registration.schema, {
				...(config as object),
				$type: type,
			});

			if (!this.currentStep.actions) {
				this.currentStep.actions = [];
			}
			this.currentStep.actions.push(validated as any);

			logger.debug(`Added step action: ${type}`, { config: validated });
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Validation failed';
			logger.error(`Invalid config for action "${type}"`, { message });
			throw new Error(`Invalid configuration for action "${type}": ${message}`, { cause: error });
		}
		return this;
	}

	addFormAction<K extends keyof TActions & string>(type: K, config: Omit<TActions[K], '$type'>): this {
		const registration = this.actionRegistry.getAction(type);

		if (!registration || !registration.schema) {
			throw new Error(`Action type "${type}" is not registered`);
		}

		try {
			const validated = validateRegistrationConfig(registration.schema, {
				...(config as object),
				$type: type,
			});

			if (!this.config.actions) {
				this.config.actions = [];
			}
			this.config.actions.push(validated as any);

			logger.debug(`Added form action: ${type}`, { config: validated });
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Validation failed';
			logger.error(`Invalid config for action "${type}"`, { message });
			throw new Error(`Invalid configuration for action "${type}": ${message}`, { cause: error });
		}
		return this;
	}

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
			hasView: !!this.config.view,
			formActions: this.config.actions?.length || 0,
			stepActions: totalStepActions,
		});

		return {
			id: this.config.id,
			title: this.config.title,
			description: this.config.description,
			steps: this.config.steps as any,
			view: this.config.view,
			actions: this.config.actions,
			validationMode: this.config.validationMode,
			reValidateMode: this.config.reValidateMode,
			grid: this.config.grid,
			className: this.config.className,
			style: this.config.style,
		};
	}
}
