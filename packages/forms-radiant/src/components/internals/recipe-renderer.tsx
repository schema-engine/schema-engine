import type { JsxRenderable } from '@ecopages/jsx';
import { type NormalizedFormConfig, type RecipeRegistration } from '@schema-engine/forms';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import { applySlotDefaults } from '@schema-engine/forms/recipes';
import type { RadiantRecipeAdapterPayload } from '@/recipes/types';
import { getFormGridStyles } from '@/hooks/grid-styles';
import { FormElements } from './form-elements';
import { FormStep } from '@/components/form-step';

/**
 * Authors every step's fields once, inside the recipe chrome.
 *
 * @remarks
 * View-owned shell: no per-step filtering and no slot projection. The
 * `se-form-step` hosts toggle their own `hidden` attribute from the instance's
 * step state, so SSR emits the whole form and step switching is pure DOM.
 */
export function RecipeRenderer({
	config,
	engine,
	recipe,
	children,
}: {
	config: NormalizedFormConfig;
	engine: FormEngine;
	recipe: RecipeRegistration<any, any> | undefined;
	children?: JsxRenderable;
}): JsxRenderable {
	const viewConfig = recipe
		? applySlotDefaults((config.view ?? { $type: recipe.$type }) as Record<string, unknown>, recipe.slotDefaults)
		: ((config.view as Record<string, unknown> | undefined) ?? {});
	const slotContext = { config, viewConfig };
	const isWizard = recipe?.kind === 'wizard';

	const content = (
		<>
			{config.steps.map((step, index) => (
				<FormStep key={step.id} stepIndex={index} isWizard={isWizard}>
					{step.elements.length ? (
						<div class="se-form-elements" style={getFormGridStyles(config.grid)}>
							<FormElements elements={step.elements} engine={engine} />
						</div>
					) : null}
				</FormStep>
			))}
			{children}
		</>
	);
	if (!recipe) return content;

	const adapter = recipe.render as RadiantRecipeAdapterPayload;
	if (!adapter?.slots) throw new Error(`Recipe '${recipe.$type}' is missing a Radiant adapter payload.`);
	const slots = {
		header: adapter.slots.header?.(slotContext),
		progress: adapter.slots.progress?.(slotContext),
		content,
		actions: adapter.slots.actions?.(slotContext),
	};
	const output = adapter.shell ? (
		adapter.shell({ slots, viewConfig, config })
	) : (
		<>
			{slots.header}
			{slots.progress}
			{slots.content}
			{slots.actions}
		</>
	);
	return output;
}
