import {
	customElement,
	onUpdated,
	prop,
	RadiantElement,
	registerSsrPreparationCallback,
	state,
} from '@ecopages/radiant';
import { onContextUpdate, provideContext, type ContextProvider } from '@ecopages/radiant/context';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { resolveFormRecipe, type NormalizedFormConfig, type RecipeRegistration } from '@schema-engine/forms';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { formInstanceContext, type FormInstanceContextValue, type StepStates } from '@/contexts/form-instance-context';
import { formEngineContext, type FormEngineContextValue } from '@/components/provider';
import { onActiveEngineChange } from '@/registries/active-engine';
import {
	findNearestRuiForm,
	getRuiConstraintStore,
	getRuiFormStore,
	type RuiConstraintStore,
} from '@/lib/rui-form-utils';
import { collectConstrainedElements } from '@/lib/constraint-elements';
import { evaluateConstraintLogic } from '@/hooks/constraint-logic';
import { fieldNamesForStep, validateCurrentStepFields } from '@/lib/validate-current-step';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';
import { hydrateFieldRules } from '@/components/internals/field-rule-hydrator';

function escapeSelector(value: string): string {
	return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
		? CSS.escape(value)
		: value.replace(/(["\\])/g, '\\$1');
}

function createInitialStepStates(totalSteps: number): StepStates {
	return {
		completed: Array.from({ length: totalSteps }, () => false),
		valid: Array.from({ length: totalSteps }, () => false),
		visited: Array.from({ length: totalSteps }, () => false),
	};
}

/**
 * Behavior host for one composed form instance.
 *
 * @remarks
 * View-owned shell: the `FormInstance` view authors `<rui-form>` and the recipe
 * chrome as light-DOM children, so SSR expands the whole form without a derived
 * tree. Step switching is pure DOM: each step's fields are authored once and the
 * `se-form-step` hosts toggle `hidden` from this host's step state.
 *
 * The host publishes `formInstanceContext` (step machine + navigation); recipe
 * blocks consume it and derive their chrome from the config and view-config
 * props authored alongside them.
 *
 * @element se-form-instance
 */
@customElement('se-form-instance')
export class FormInstanceElement extends RadiantElement {
	/** Frozen config from `engine.defineForm` / `engine.validateForm` via `FormProvider`. */
	@prop({ type: Object }) config!: NormalizedFormConfig;
	@state engine?: CoreFormEngine;
	@prop({ type: Object }) defaultValues?: Record<string, unknown>;
	@state onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	@state isSubmitting = false;

	@state currentStep = 0;
	@state stepStates: StepStates = { completed: [], valid: [], visited: [] };
	private publishedContext?: FormInstanceContextValue;
	private unsubscribeConstraints?: () => void;
	private unsubscribeActiveEngine?: () => void;

	@provideContext<typeof formInstanceContext>({
		context: formInstanceContext,
		initialValue: {} as FormInstanceContextValue,
		serialize: () => ({}),
	})
	provider!: ContextProvider<typeof formInstanceContext>;

	constructor() {
		super();
		registerSsrPreparationCallback(this, () => this.publish());
		this.publishLiveContexts();
	}

	@onContextUpdate({ context: formEngineContext, requestUpdate: false })
	onFormEngine(value: FormEngineContextValue): void {
		if (value.engine && !this.engine) {
			this.engine = value.engine;
			this.publish();
		}
	}

	protected override onConnected(): void {
		if (!this.engine) {
			this.unsubscribeActiveEngine = onActiveEngineChange((engine) => {
				if (!this.engine) {
					this.engine = engine;
				}
				this.publish();
			});
		}
		hydrateFieldRules(this);
		queueMicrotask(() => hydrateFieldRules(this));
		this.resetStepState();
		this.publish();
		this.connectConstraints();
		this.wireRuiForm();
	}

	override disconnectedCallback(): void {
		this.unsubscribeActiveEngine?.();
		this.disconnectConstraints();
		super.disconnectedCallback();
	}

	@onUpdated(['config'])
	onConfigUpdated(): void {
		hydrateFieldRules(this);
		this.resetStepState();
		this.connectConstraints();
		this.wireRuiForm();
	}

	@onUpdated(['currentStep', 'stepStates', 'isSubmitting', 'engine', 'onSubmit'])
	onInstanceStateUpdated(): void {
		this.wireRuiForm();
		this.publish();
	}

	private wireRuiForm(): void {
		const ruiForm = findNearestRuiForm(this);
		if (ruiForm && typeof (ruiForm as { onSubmit?: unknown }).onSubmit !== 'function') {
			(ruiForm as { onSubmit?: (data: Record<string, unknown>) => void }).onSubmit = (data) =>
				this.onSubmit?.(data);
		}
	}

	private connectConstraints(): void {
		this.disconnectConstraints();
		const store = getRuiConstraintStore(this);
		if (store) {
			this.applyConstraints(store);
			this.unsubscribeConstraints = store.subscribe(() => this.applyConstraints(store));
			return;
		}

		queueMicrotask(() => {
			if (this.unsubscribeConstraints) {
				return;
			}
			const deferredStore = getRuiConstraintStore(this);
			if (deferredStore) {
				this.applyConstraints(deferredStore);
				this.unsubscribeConstraints = deferredStore.subscribe(() => this.applyConstraints(deferredStore));
			}
		});
	}

	private disconnectConstraints(): void {
		this.unsubscribeConstraints?.();
		this.unsubscribeConstraints = undefined;
	}

	private applyConstraints(store: RuiConstraintStore): void {
		if (!this.config) {
			return;
		}

		const constrained = collectConstrainedElements(this.config);
		if (constrained.length === 0) {
			return;
		}

		const values = store.getValues();
		for (const item of constrained) {
			const { shouldShow } = evaluateConstraintLogic(item.constraints, item.isRequired, item.fieldName, values);

			const selector =
				item.id && item.id !== item.fieldName
					? `[data-se-constraint-field="${escapeSelector(item.fieldName)}"], [data-se-constraint-field="${escapeSelector(item.id)}"]`
					: `[data-se-constraint-field="${escapeSelector(item.fieldName)}"]`;

			const targets = this.querySelectorAll(selector);
			for (const target of targets) {
				if (target instanceof HTMLElement) {
					target.hidden = !shouldShow;
				}
			}
		}
	}

	private resetStepState(): void {
		const total = this.config?.steps.length ?? 1;
		this.currentStep = 0;
		this.stepStates = createInitialStepStates(total);
		this.markStepVisited(0);
	}

	private isLastStep(): boolean {
		return this.currentStep >= (this.config?.steps.length ?? 1) - 1;
	}

	readonly markStepCompleted = (index: number): void => {
		this.stepStates = {
			...this.stepStates,
			completed: this.stepStates.completed.map((value, stepIndex) => (stepIndex === index ? true : value)),
			valid: this.stepStates.valid.map((value, stepIndex) => (stepIndex === index ? true : value)),
		};
	};

	readonly markStepVisited = (index: number): void => {
		this.stepStates = {
			...this.stepStates,
			visited: this.stepStates.visited.map((value, stepIndex) => (stepIndex === index ? true : value)),
		};
	};

	readonly goToStep = (index: number): void => {
		const total = this.config?.steps.length ?? 1;
		if (index < 0 || index >= total) {
			return;
		}
		this.currentStep = index;
		this.markStepVisited(index);
	};

	readonly goToNextStep = async (): Promise<void> => {
		if (this.isLastStep()) {
			return;
		}

		const store = getRuiFormStore(this);
		if (!store) {
			return;
		}

		const isValid = await validateCurrentStepFields(store, fieldNamesForStep(this.config?.steps[this.currentStep]));
		if (!isValid) {
			return;
		}

		this.markStepCompleted(this.currentStep);
		this.markStepVisited(this.currentStep + 1);
		this.currentStep += 1;
	};

	readonly goToPreviousStep = (): void => {
		if (this.currentStep <= 0) {
			return;
		}
		this.currentStep -= 1;
	};

	getContextValue(): FormInstanceContextValue {
		const totalSteps = this.config?.steps.length ?? 1;
		return {
			currentStep: this.currentStep,
			totalSteps,
			isWizard: this.resolveRecipe()?.kind === 'wizard',
			stepStates: this.stepStates,
			goToStep: this.goToStep,
			goToNextStep: this.goToNextStep,
			goToPreviousStep: this.goToPreviousStep,
			markStepCompleted: this.markStepCompleted,
			markStepVisited: this.markStepVisited,
			isSubmitting: this.isSubmitting,
		};
	}

	private resolveRecipe(): RecipeRegistration<any, any> | undefined {
		if (!this.engine || !this.config) {
			return undefined;
		}
		return resolveFormRecipe(this.config, this.engine);
	}

	private publish(): void {
		this.provider.setContext(this.getContextValue());
	}

	/**
	 * Publishes the live context facade at construction.
	 *
	 * @remarks
	 * Nested consumers construct while the SSR pipeline serializes authored
	 * children — before this host's SSR preparation publishes fresh snapshots.
	 * Getters defer to host state so those consumers read props applied after
	 * construction; later `publish()` calls swap in a plain snapshot that
	 * re-notifies subscribers on state changes.
	 */
	private publishLiveContexts(): void {
		const context = {} as FormInstanceContextValue;
		Object.defineProperties(context, {
			currentStep: { get: () => this.currentStep },
			totalSteps: { get: () => this.config?.steps.length ?? 1 },
			isWizard: { get: () => this.resolveRecipe()?.kind === 'wizard' },
			stepStates: { get: () => this.stepStates },
			goToStep: { get: () => this.goToStep },
			goToNextStep: { get: () => this.goToNextStep },
			goToPreviousStep: { get: () => this.goToPreviousStep },
			markStepCompleted: { get: () => this.markStepCompleted },
			markStepVisited: { get: () => this.markStepVisited },
			isSubmitting: { get: () => this.isSubmitting },
		});
		this.provider.setContext(context);
	}
}

/**
 * JSX view around `<se-form-instance>`.
 *
 * @remarks
 * View-owned shell: the `ConfiguredRuiForm` tree is authored as light-DOM
 * children so SSR expands it. The element re-attaches live objects (`engine`,
 * `onSubmit`) through `prop:` bindings, mirroring `RuiForm`'s `prop:resolver`.
 */
export function FormInstance({
	config,
	engine,
	defaultValues,
	onSubmit,
	isSubmitting = false,
	children,
}: {
	config: NormalizedFormConfig;
	engine: CoreFormEngine;
	defaultValues?: Record<string, unknown>;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	isSubmitting?: boolean;
	children?: JsxRenderable;
}): JsxRenderable {
	void isSubmitting;
	return jsx('se-form-instance', {
		'prop:config': config,
		'prop:engine': engine,
		'prop:defaultValues': defaultValues,
		'prop:onSubmit': onSubmit,
		children: (
			<ConfiguredRuiForm config={config} defaultValues={defaultValues} onSubmit={onSubmit}>
				<RecipeRenderer config={config} engine={engine} recipe={resolveFormRecipe(config, engine)}>
					{children}
				</RecipeRenderer>
			</ConfiguredRuiForm>
		),
	});
}
