import type { JsxRenderable } from '@ecopages/jsx';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import type { NormalizedFormConfig, RecipeRegistration } from '@schema-engine/forms';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import { GRID_CLASS, getGridVariables } from '@schema-engine/layout';
import { stepGrid } from '@schema-engine/forms/lib/validate-form';
import type { RecipeSlot } from '@schema-engine/forms/recipes';
import type { RadiantRecipeAdapterPayload } from '@/recipes/types';
import { createFormMeta } from '@/lib/instance-view';
import { FormElements } from './form-elements';
import { collectFormInitialValues } from '@/adapters/radiant/rui-form-shell';
import { FormStep } from '@/components/form-step';

/**
 * Authors every step's fields once, inside the recipe chrome.
 *
 * @remarks
 * View-owned shell: no per-step filtering and no slot projection. The
 * `se-form-step` hosts bind their own `hidden` attribute to the instance's
 * step state, so SSR emits the whole form and step switching is pure DOM.
 */
function LayoutThemeStyle({ themeId, css }: { themeId: string; css: string }): JsxRenderable {
	return jsx('style', { 'data-se-theme-css': themeId, children: css });
}

export function RecipeRenderer({
	config,
	engine,
	recipe,
	children,
	initialValues,
	rowIds,
}: {
	config: NormalizedFormConfig;
	engine: FormEngine;
	recipe: RecipeRegistration | undefined;
	children?: JsxRenderable;
	initialValues?: Record<string, unknown>;
	/** The row ids the server's container gave each array, which the arrays render their rows with. */
	rowIds?: Readonly<Record<string, readonly string[]>>;
}): JsxRenderable {
	const values = initialValues ?? collectFormInitialValues(config);
	const layout = engine.getLayout();
	const viewConfig = (config.view as Record<string, unknown> | undefined) ?? {};
	const meta = createFormMeta(config);
	const slotContext = (slot: Exclude<RecipeSlot, 'shell'>) => ({
		meta,
		slotConfig: viewConfig[slot] as Record<string, unknown> | undefined,
	});
	const isWizard = recipe?.kind === 'wizard';

	const content = (
		<>
			<LayoutThemeStyle themeId={layout.id} css={layout.css} />
			{config.steps.map((step, index) => (
				<FormStep
					key={step.id}
					stepId={step.id}
					stepIndex={index}
					hidden={isWizard && index !== 0}
					class={step.className}
					style={step.style}
					appearance={step.appearance}
				>
					{step.elements.length ? (
						<div
							class={`se-form-elements se-form-grid ${GRID_CLASS}`}
							data-se-theme={layout.id}
							style={getGridVariables(stepGrid(config, step), layout.grid, step.elements)}
						>
							<FormElements
								elements={step.elements}
								engine={engine}
								initialValues={initialValues}
								values={values}
								constraintContext={{ values, initialValues, rowIds }}
							/>
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
		header: adapter.slots.header?.(slotContext('header')),
		progress: adapter.slots.progress?.(slotContext('progress')),
		content,
		actions: adapter.slots.actions?.(slotContext('actions')),
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
