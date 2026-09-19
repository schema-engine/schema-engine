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
import { findNearestRuiForm } from '@/lib/rui-form-utils';
import { createConstraintLookup } from '@/lib/constraint-elements';
import { evaluateConstraintLogic } from '@/hooks/constraint-logic';
import { fieldNamesForStep, validateCurrentStepFields } from '@/lib/validate-current-step';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { FormController } from '@/adapters/radiant/controller';
import { ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';

/**
 * Fields this wrapper owns, excluding those belonging to a nested constraint.
 *
 * @remarks
 * Without the guard, a constrained field inside a constrained fieldset would be
 * written twice in one pass and the later write — document order, so the inner
 * one — would silently win over its own parent's `disable`.
 */
function ownedFields(wrapper: HTMLElement): HTMLElement[] {
	return [...wrapper.querySelectorAll<HTMLElement>('se-field')].filter(
		(field) => field.closest('[data-se-constraint-field]') === wrapper,
	);
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
	private form?: FormController;
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
		this.resetStepState();
		this.publish();
		this.connectForm();
		this.wireRuiForm();
	}

	override disconnectedCallback(): void {
		this.unsubscribeActiveEngine?.();
		this.form?.disconnect();
		this.form = undefined;
		super.disconnectedCallback();
	}

	@onUpdated(['config'])
	onConfigUpdated(): void {
		this.resetStepState();
		this.connectForm();
		this.wireRuiForm();
	}

	@onUpdated(['currentStep', 'stepStates', 'isSubmitting', 'engine', 'onSubmit'])
	onInstanceStateUpdated(): void {
		this.wireRuiForm();
		this.publish();
	}

	private wireRuiForm(): void {
		const ruiForm = this.form?.host ?? findNearestRuiForm(this);
		if (ruiForm && typeof (ruiForm as { onSubmit?: unknown }).onSubmit !== 'function') {
			(ruiForm as { onSubmit?: (data: Record<string, unknown>) => void }).onSubmit = (data) =>
				this.onSubmit?.(data);
		}
	}

	/**
	 * @remarks
	 * `se-form-instance` wraps `rui-form`, so it sits above `formContext`. Point
	 * the controller at the child form; do not ask FormController to search.
	 */
	private connectForm(): void {
		const ruiForm = findNearestRuiForm(this);
		if (!ruiForm) {
			this.form?.disconnect();
			this.form = undefined;
			return;
		}
		if (this.form?.host === ruiForm) {
			this.applyConstraints();
			return;
		}
		this.form?.disconnect();
		this.form = new FormController(ruiForm);
		this.form.connect(() => this.applyConstraints());
	}

	/**
	 * Syncs every rendered constraint wrapper against the live value tree.
	 *
	 * @remarks
	 * Driven by what is in the DOM rather than by selectors built from the config:
	 * the config only knows authored template paths, while the renderer emits
	 * composed ones, so matching config to DOM missed every field inside an array.
	 * Each wrapper is evaluated at its own rendered path, which is also what scopes
	 * a constraint's sibling lookup to the right array row.
	 */
	private applyConstraints(): void {
		if (!this.config || !this.form?.ready) {
			return;
		}

		const declaring = createConstraintLookup(this.config);
		const values = this.form.getValues();

		for (const target of this.querySelectorAll<HTMLElement>('[data-se-constraint-field]')) {
			const fieldPath = target.getAttribute('data-se-constraint-field') ?? '';
			const item = declaring(fieldPath);
			if (!item) {
				continue;
			}

			const { shouldShow, shouldDisable } = evaluateConstraintLogic(
				item.constraints,
				item.isRequired,
				fieldPath,
				values,
			);

			target.hidden = !shouldShow;
			for (const field of ownedFields(target)) {
				(field as HTMLElement & { disabled?: boolean }).disabled = shouldDisable;
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

		const store = this.form?.store;
		if (!store) {
			return;
		}

		const isValid = await validateCurrentStepFields(
			store,
			fieldNamesForStep(this.config?.steps[this.currentStep], this.form?.getValues()),
		);
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
