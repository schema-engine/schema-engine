import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { resolveFormRecipe, type NormalizedFormConfig } from '@schema-engine/forms';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';

/** Registers `<se-form-instance>` when this view is imported. */
export { FormInstanceElement } from './form-instance.script';

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
