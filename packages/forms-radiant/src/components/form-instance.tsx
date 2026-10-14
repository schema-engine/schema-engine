import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { resolveFormRecipe, type NormalizedFormConfig } from '@schema-engine/forms';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { collectFormInitialValues, ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';

/** Registers `<se-form-instance>` when this view is imported. */
export { FormInstanceElement } from './form-instance.script';

/**
 * JSX view around `<se-form-instance>`.
 *
 * @remarks
 * View-owned shell: the `ConfiguredRuiForm` tree is authored as light-DOM
 * children so SSR expands it. The recipe renderer receives the live `engine`,
 * while the enclosing `se-form-renderer` publishes it to this host through
 * `formEngineContext`. The element re-attaches `onSubmit` through a `prop:`
 * binding, mirroring `RuiForm`'s `prop:resolver`.
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
	const initialValues = collectFormInitialValues(config, defaultValues);

	return jsx('se-form-instance', {
		config,
		defaultValues,
		'prop:onSubmit': onSubmit,
		isSubmitting,
		children: (
			<ConfiguredRuiForm config={config} defaultValues={defaultValues} onSubmit={onSubmit}>
				<RecipeRenderer
					config={config}
					engine={engine}
					recipe={resolveFormRecipe(config, engine)}
					initialValues={initialValues}
				>
					{children}
				</RecipeRenderer>
			</ConfiguredRuiForm>
		),
	});
}
