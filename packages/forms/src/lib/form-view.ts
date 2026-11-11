import type { FormConfigView } from '@/lib/normalized-form-config';

/** Default `view.$type` for multi-step forms that omit `view`; see `createFormEngine({ defaultWizardRecipe })`. */
export const DEFAULT_WIZARD_RECIPE = 'bare-controls';

/**
 * Steps to paint for a normalized form.
 *
 * A recipe owns wizard navigation, so with a `view` only the current step is rendered.
 * Without a `view`, every step is flattened onto one page so later fields stay reachable.
 */
export function getRenderableSteps<T extends FormConfigView>(config: T, currentStep: number): T['steps'] {
	if (config.view) {
		const step = config.steps[currentStep] ?? config.steps[0];
		return step ? [step] : [];
	}
	return config.steps;
}

/**
 * Assert an engine is available to normalize authoring input or JSON.
 *
 * The canonical entry point for render hosts (React `FormRenderer`, Radiant
 * `FormProvider`): normalize once at the boundary, then pass the frozen
 * normalized config down. Renderers must not accept authoring input.
 */
export function assertFormEngine<E extends { validateForm: (config: unknown) => unknown }>(
	engine: E | undefined,
	config: FormConfigView,
): asserts engine is E {
	if (!engine) {
		throw new Error(
			config.view?.$type
				? `Form '${config.id}' uses view '${config.view.$type}' but no FormEngine was supplied.`
				: `Form '${config.id}' cannot be normalized without a FormEngine.`,
		);
	}
}
