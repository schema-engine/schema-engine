import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import type { FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { getViewRecipe } from '@schema-engine/forms/recipes';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { collectFormInitialValues, ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';
import { flattenValues } from '@/adapters/radiant/controller/values';
import type { FormProviderProps } from '@/adapters/types';

/** Registers `<se-form-instance>` when this view is imported. */
export { FormInstanceElement } from './form-instance.script';

/**
 * JSX view around `<se-form-instance>`.
 *
 * @remarks
 * View-owned shell: the `ConfiguredRuiForm` tree is authored as light-DOM
 * children so SSR expands it. The recipe renderer receives the live `engine`,
 * while the enclosing `se-form-renderer` publishes it to this host through
 * `formEngineContext`, which is how an element hydrated from server markup gets
 * it. The element re-attaches `engine`, `onSubmit`, `onChange` and `onAction`
 * through `prop:` bindings, mirroring `RuiForm`'s `prop:resolver`.
 */
export function FormInstance({
	config,
	engine,
	defaultValues,
	onSubmit,
	onChange,
	onAction,
	children,
}: {
	config: NormalizedFormConfig;
	engine: CoreFormEngine;
	defaultValues?: Record<string, unknown>;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	onChange?: (data: Record<string, unknown>) => void;
	onAction?: FormProviderProps['onAction'];
	children?: JsxRenderable;
}): JsxRenderable {
	const initialValues = collectFormInitialValues(config, defaultValues);
	return jsx('se-form-instance', {
		config,
		defaultValues,
		'prop:engine': engine,
		'prop:onSubmit': onSubmit,
		'prop:onChange': onChange,
		'prop:onAction': onAction,
		children: (
			<ConfiguredRuiForm
				config={config}
				defaultValues={defaultValues}
				initialValues={flattenValues(initialValues)}
			>
				<RecipeRenderer
					config={config}
					engine={engine}
					recipe={getViewRecipe(engine, config)}
					initialValues={initialValues}
				>
					{children}
				</RecipeRenderer>
			</ConfiguredRuiForm>
		),
	});
}
