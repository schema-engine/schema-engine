import type { JsxRenderable } from '@ecopages/jsx';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import { type NormalizedFormConfig, resolveFormRecipe } from '@schema-engine/forms';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import { getFormGridVariables } from '@schema-engine/forms/lib/grid-styles';
import { applySlotDefaults } from '@schema-engine/forms/recipes';
import type { RadiantRecipeAdapterPayload } from '@/recipes/types';
import { createFormMeta } from '@/lib/instance-view';
import { FormElements } from './form-elements';
import { collectFormDefaultValues } from '@/adapters/radiant/rui-form-shell';
import { expandValues } from '@/adapters/radiant/controller/values';
import { FormStep } from '@/components/form-step';

/**
 * Authors every step's fields once, inside the recipe chrome.
 *
 * @remarks
 * View-owned shell: no per-step filtering and no slot projection. The
 * `se-form-step` hosts toggle their own `hidden` attribute from the instance's
 * step state, so SSR emits the whole form and step switching is pure DOM.
 */
function GridThemeStyle({ themeId, css }: { themeId: string; css: string }): JsxRenderable {
	return jsx('style', { 'data-se-grid-theme': themeId, children: css });
}

export function RecipeRenderer({
	config,
	engine,
	recipe,
	children,
	initialValues,
}: {
	config: NormalizedFormConfig;
	engine: FormEngine;
	recipe: ReturnType<typeof resolveFormRecipe>;
	children?: JsxRenderable;
	initialValues?: Record<string, unknown>;
}): JsxRenderable {
	const values = expandValues(initialValues ?? collectFormDefaultValues(config));
	const { theme, css: gridThemeCss } = engine.getCompiledGrid();
	const viewConfig = recipe
		? applySlotDefaults((config.view ?? { $type: recipe.$type }) as Record<string, unknown>, recipe.slotDefaults)
		: ((config.view as Record<string, unknown> | undefined) ?? {});
	const meta = createFormMeta(config);
	const slotContext = { meta, viewConfig };
	const isWizard = recipe?.kind === 'wizard';

	const content = (
		<>
			<GridThemeStyle themeId={theme.id} css={gridThemeCss} />
			{config.steps.map((step, index) => (
				<FormStep key={step.id} stepIndex={index} isWizard={isWizard}>
					{step.elements.length ? (
						<div
							class="se-form-elements se-form-grid"
							data-se-grid-theme={theme.id}
							style={getFormGridVariables(config.grid, theme)}
						>
							<FormElements elements={step.elements} engine={engine} constraintContext={{ values }} />
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
		adapter.shell({ slots, viewConfig, meta })
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
