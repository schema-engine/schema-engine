import type { JsxRenderable } from '@ecopages/jsx';
import { getRenderableSteps, type RecipeRegistration } from '@schema-engine/forms';
import { applySlotDefaults, buildViewModel } from '@schema-engine/forms/recipes';
import type { FormConfig, FormStep } from '@schema-engine/forms/schemas';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import { ViewProvider } from '@/components/view-provider';
import type { FormInstanceContextValue } from '@/contexts/form-instance-context';
import type { RadiantRecipeAdapterPayload } from '@/recipes/types';
import { renderStepFields } from './form-elements-renderer';

function adapterFor(recipe: RecipeRegistration<any, any, RadiantRecipeAdapterPayload>): RadiantRecipeAdapterPayload {
	const adapter = recipe.render;
	if (!adapter?.slots) throw new Error(`Recipe '${recipe.$type}' is missing a Radiant adapter payload.`);
	return adapter;
}

export function RecipeRenderer({
	config,
	engine,
	instance,
	recipe,
	children,
}: {
	config: FormConfig;
	engine?: FormEngine;
	instance: FormInstanceContextValue;
	recipe: RecipeRegistration<any, any> | undefined;
	children?: JsxRenderable;
}): JsxRenderable {
	const steps = getRenderableSteps(config, recipe, instance.currentStep);
	if (steps.length === 0) return null;
	const content = (
		<>
			{steps.map((step: FormStep) => renderStepFields(step, config, engine))}
			{children}
		</>
	);
	if (!recipe) return content;

	const adapter = adapterFor(recipe as RecipeRegistration<any, any, RadiantRecipeAdapterPayload>);
	const viewConfig = applySlotDefaults(
		(config.view ?? { $type: recipe.$type }) as Record<string, unknown>,
		recipe.slotDefaults,
	);
	const context = buildViewModel({
		config,
		kind: recipe.kind,
		currentStepIndex: instance.currentStep,
		navigation: {
			canGoNext: instance.currentStep < instance.totalSteps - 1,
			canGoPrevious: instance.currentStep > 0,
			isFirstStep: instance.currentStep === 0,
			isLastStep: instance.currentStep === instance.totalSteps - 1,
			goToStep: instance.goToStep,
			goToNextStep: instance.goToNextStep,
			goToPreviousStep: instance.goToPreviousStep,
		},
		isSubmitting: instance.isSubmitting,
		viewConfig,
		stepStates: instance.stepStates,
	});
	const slots = {
		header: adapter.slots.header?.(),
		progress: adapter.slots.progress?.(),
		content,
		actions: adapter.slots.actions?.(),
	};
	const output = adapter.shell ? (
		adapter.shell({ slots, viewConfig })
	) : (
		<>
			{slots.header}
			{slots.progress}
			{slots.content}
			{slots.actions}
		</>
	);
	return <ViewProvider value={context}>{output}</ViewProvider>;
}
