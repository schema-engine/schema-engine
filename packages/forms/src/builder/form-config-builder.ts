import { logger } from '@/lib/logger';
import type { FormConfig } from '@/schemas/form-config';
import type { PartialFormConfig, BuilderFormStep } from './types';

/**
 * Snapshot nested builder state so later mutations cannot change returned forms.
 * Copies owned arrays/objects; leaves callable values by reference.
 */
function snapshotFormConfig(config: PartialFormConfig): unknown {
	return {
		id: config.id,
		title: config.title,
		description: config.description,
		steps: config.steps.map((step) => ({
			id: step.id,
			title: step.title,
			description: step.description,
			icon: step.icon,
			elements: [...step.elements],
			actions: step.actions ? [...step.actions] : undefined,
		})),
		view: config.view ? { ...config.view } : undefined,
		actions: config.actions ? [...config.actions] : undefined,
		validationMode: config.validationMode,
		reValidateMode: config.reValidateMode,
		grid: config.grid ? { ...config.grid } : undefined,
		className: config.className,
		style: config.style ? { ...config.style } : undefined,
	};
}

export interface FormConfigBuilderOptions {
	hasElement: (id: string) => boolean;
	hasRecipe: (id: string) => boolean;
	hasAction: (id: string) => boolean;
	commit: (config: unknown) => FormConfig;
}

/**
 * @deprecated Prefer {@link FormEngine.defineForm}. This fluent adapter exists for
 * existing callers; it snapshots builder state and commits through the same
 * validation pipeline. It will be removed after those call sites migrate.
 *
 * Setters accumulate raw authoring input. {@link build} snapshots that input and
 * runs the engine validation pipeline once, so defaults and transforms are applied
 * a single time and later builder calls cannot mutate returned forms.
 */
export class FormConfigBuilder<
	TElements extends Record<string, unknown> = Record<never, unknown>,
	TRecipes extends Record<string, unknown> = Record<never, unknown>,
	TActions extends Record<string, unknown> = Record<never, unknown>,
> {
	private config: PartialFormConfig;
	private currentStep: BuilderFormStep | null = null;

	constructor(private readonly options: FormConfigBuilderOptions) {
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
	setView<K extends keyof TRecipes & string>(id: K, config: TRecipes[K] & object): this {
		if (!this.options.hasRecipe(id)) {
			throw new Error(`Recipe "${id}" is not registered`);
		}
		this.config.view = { ...config, $type: id };
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

	addElement<K extends keyof TElements & string>(id: K, config: TElements[K] & object): this {
		if (!this.currentStep) {
			throw new Error('Must call addStep() before adding elements');
		}
		if (!this.options.hasElement(id)) {
			throw new Error(`Element type "${id}" is not registered`);
		}
		this.currentStep.elements.push({ ...config, $type: id });
		return this;
	}

	addStepAction<K extends keyof TActions & string>(type: K, config: TActions[K] & object): this {
		if (!this.currentStep) {
			throw new Error('Must call addStep() before adding step actions');
		}
		if (!this.options.hasAction(type)) {
			throw new Error(`Action type "${type}" is not registered`);
		}
		if (!this.currentStep.actions) {
			this.currentStep.actions = [];
		}
		this.currentStep.actions.push({ ...config, $type: type });
		return this;
	}

	addFormAction<K extends keyof TActions & string>(type: K, config: Omit<TActions[K], '$type'> & object): this {
		if (!this.options.hasAction(type)) {
			throw new Error(`Action type "${type}" is not registered`);
		}
		if (!this.config.actions) {
			this.config.actions = [];
		}
		this.config.actions.push({ ...config, $type: type });
		return this;
	}

	build(): FormConfig {
		if (!this.config.id) {
			throw new Error('Form ID is required. Call setId() before building.');
		}

		if (this.config.steps.length === 0) {
			throw new Error('At least one step is required. Call addStep() before building.');
		}

		const snapshot = snapshotFormConfig(this.config);
		return this.options.commit(snapshot);
	}
}
