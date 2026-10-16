import {
	customElement,
	onUpdated,
	prop,
	RadiantElement,
	registerSsrPreparationCallback,
	state,
} from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import { resolveFormRecipe, type NormalizedFormConfig, type RecipeRegistration } from '@schema-engine/forms';
import { flattenStepElements } from '@schema-engine/forms/lib/field-scope';
import { formInstanceContext, type FormInstanceContextValue, type StepStates } from '@/contexts/form-instance-context';
import { FormController, FormEngineController } from '@/adapters/radiant/controller';
import { findNearestRuiForm } from '@/lib/rui-form-utils';
import { createConstraintLookup } from '@/lib/constraint-elements';
import { evaluateConstraints } from '@schema-engine/forms/constraints';
import { fieldNamesForStep, validateCurrentStepFields } from '@/lib/validate-current-step';
import { connectValidationDependencies } from '@/lib/validation-deps';
import { applyConstraintRequired } from '@/lib/constraint-required-rules';
import { shouldSurfaceDependentError } from '@schema-engine/forms/schemas/validation';
import type { RuiFormElement } from '@ecopages/radiant-ui/form';
import { expandValues } from '@/adapters/radiant/controller/values';
import { whenEngineAvailable } from '@/contexts/resolve-form-engine';

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
	@prop({ type: Object }) defaultValues?: Record<string, unknown>;
	@state onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	@prop({ type: Boolean, defaultValue: false }) isSubmitting = false;

	@state currentStep = 0;
	@state stepStates: StepStates = { completed: [], valid: [], visited: [] };
	private readonly formEngine = new FormEngineController(this);
	private form?: FormController;
	private unwatchValidationDependencies?: () => void;
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

	protected override onConnected(): void {
		this.formEngine.connect(() => {
			this.watchValidationDependencies();
			this.publish();
		});
		this.unsubscribeActiveEngine = whenEngineAvailable(this, undefined, () => {
			this.watchValidationDependencies();
			this.publish();
		});
		this.resetStepState();
		this.publish();
		this.connectForm();
		this.wireRuiForm();
	}

	override disconnectedCallback(): void {
		this.formEngine.disconnect();
	this.unsubscribeActiveEngine?.();
		this.stopWatchingValidationDependencies();
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

	@onUpdated(['currentStep', 'stepStates', 'isSubmitting', 'onSubmit'])
	onInstanceStateUpdated(): void {
		this.wireRuiForm();
		this.connectForm();
		this.publish();
	}

	private wireRuiForm(): void {
		const ruiForm = (this.form?.host ?? findNearestRuiForm(this)) as RuiFormElement | undefined;
		if (ruiForm) {
			ruiForm.onSubmit = this.onSubmit ? (data) => this.onSubmit?.(expandValues(data)) : undefined;
		}
	}

	/**
	 * @remarks
	 * `se-form-instance` wraps `rui-form`, so it sits above `formContext`. Point
	 * the controller at the child form; do not ask FormController to search.
	 */
	private connectForm(): void {
		const ruiForm = findNearestRuiForm(this);
		this.stopWatchingValidationDependencies();
		if (!ruiForm) {
			this.form?.disconnect();
			this.form = undefined;
			return;
		}
		if (this.form?.host === ruiForm) {
			this.applyConstraints();
			this.watchValidationDependencies();
			return;
		}
		this.form?.disconnect();
		this.form = new FormController(ruiForm);
		this.form.connect(() => {
			this.applyConstraints();
			this.watchValidationDependencies();
		});
	}

	/**
	 * @remarks
	 * Idempotent because the context callback fires on every form update, while
	 * the subscription must outlive them: it carries the previous value snapshot
	 * that stops `validateField` from re-entering itself.
	 */
	private watchValidationDependencies(): void {
		const engine = this.formEngine.engine;
		if (this.unwatchValidationDependencies || !this.config || !this.form?.ready || !engine) {
			return;
		}
		this.unwatchValidationDependencies = connectValidationDependencies(
			this.form,
			flattenStepElements(this.config.steps),
			engine.getValidationRegistry(),
		);
	}

	private stopWatchingValidationDependencies(): void {
		this.unwatchValidationDependencies?.();
		this.unwatchValidationDependencies = undefined;
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

			const { shouldShow, shouldDisable, isRequired } = evaluateConstraints({
				constraints: item.constraints,
				baseRequired: item.isRequired,
				fieldPath,
				values,
			});

			target.hidden = !shouldShow;
			for (const field of ownedFields(target)) {
				(field as HTMLElement & { disabled?: boolean }).disabled = item.disabled || shouldDisable;
				const requiredChanged = applyConstraintRequired(field, isRequired);
				const name = field.getAttribute('name');
				const store = this.form?.store;
				if (name && store) {
					const { touched, isSubmitted } = store.getState();
					if (
						requiredChanged &&
						shouldSurfaceDependentError({ touched: Boolean(touched[name]), submitted: isSubmitted })
					) {
						void store.validateField(name);
					}
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
		const engine = this.formEngine.engine;
		if (!engine || !this.config) {
			return undefined;
		}
		return resolveFormRecipe(this.config, engine);
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
