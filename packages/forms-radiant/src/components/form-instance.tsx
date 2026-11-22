import type { JsxRenderable } from '@ecopages/jsx';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import type { FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { getViewRecipe } from '@schema-engine/forms/recipes';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { collectFormInitialValues, ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';
import type { FormProviderProps } from '@/adapters/types';
import { createFormStateContainer, toHydration } from '@schema-engine/forms/state-container';

/** Registers `<se-form-instance>` when this view is imported. */
import { FormInstanceElement } from './form-instance.script';

export { FormInstanceElement };

/**
 * JSX view around `<se-form-instance>`.
 *
 * @remarks
 * View-owned shell: the `ConfiguredRuiForm` tree is authored as light-DOM
 * children so SSR expands it. The recipe renderer receives the live `engine`,
 * while the enclosing `se-form-renderer` publishes it to this host through
 * `formEngineContext`, which is how an element hydrated from server markup gets
 * it. The element re-attaches `engine`, `onSubmit`, `onChange` and `onAction`
 * as properties, mirroring `RuiForm`'s `prop:resolver`. The server's snapshot of the form
 * (`hydration`) is serialized with the instance, and the rows it renders carry its row ids,
 * so the client starts from the state the server rendered.
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
	onSubmit?: FormProviderProps['onSubmit'];
	onChange?: (data: Record<string, unknown>) => void;
	onAction?: FormProviderProps['onAction'];
	children?: JsxRenderable;
}): JsxRenderable {
	const initialValues = collectFormInitialValues(config, defaultValues);
	const hydration = toHydration(
		createFormStateContainer({
			config,
			registry: engine.getValidationRegistry(),
			defaults: initialValues,
		}).getServerSnapshot(),
	);
	return (
		<FormInstanceElement
			config={config}
			defaultValues={defaultValues}
			engine={engine}
			onSubmit={onSubmit}
			onChange={onChange}
			onAction={onAction}
			hydration={hydration}
		>
			<ConfiguredRuiForm config={config} layoutThemeId={engine.getLayout().id}>
				<RecipeRenderer
					config={config}
					engine={engine}
					recipe={getViewRecipe(engine, config)}
					initialValues={initialValues}
					rowIds={hydration.rowIds}
				>
					{children}
				</RecipeRenderer>
			</ConfiguredRuiForm>
		</FormInstanceElement>
	);
}
