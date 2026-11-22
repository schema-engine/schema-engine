import type { JsxRenderable } from '@ecopages/jsx';
import { isServer } from '@ecopages/radiant/is-server';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import type { FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { getViewRecipe } from '@schema-engine/forms/recipes';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { collectFormInitialValues, ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';
import type { FormProviderProps } from '@/adapters/types';
import { createFormStateContainer, toHydration, type FormStateHydration } from '@schema-engine/forms/state-container';

/** Registers `<se-form-instance>` when this view is imported. */
import { FormInstanceElement } from './form-instance.script';

export { FormInstanceElement };

/**
 * The snapshot of the container the server render uses, which the client's first form starts from.
 *
 * @remarks
 * Computed only on the server (`isServer`, since Radiant's light-DOM shim defines `document` there): a client render builds its container in `se-form-instance` and
 * reads the serialized payload once, so it makes none here. The server builds one container per render and
 * takes its row ids for the arrays and its snapshot for the payload.
 */
function serverHydration(
	config: NormalizedFormConfig,
	engine: CoreFormEngine,
	defaults: Record<string, unknown>,
): FormStateHydration | undefined {
	if (!isServer) return undefined;
	return toHydration(
		createFormStateContainer({ config, registry: engine.getValidationRegistry(), defaults }).getServerSnapshot(),
	);
}

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
	const hydration = serverHydration(config, engine, initialValues);
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
					rowIds={hydration?.rowIds}
				>
					{children}
				</RecipeRenderer>
			</ConfiguredRuiForm>
		</FormInstanceElement>
	);
}
