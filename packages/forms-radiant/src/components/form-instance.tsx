import type { JsxRenderable } from '@ecopages/jsx';
import { isServer } from '@ecopages/radiant/is-server';
import type { DefaultValuesOf, FormValues, NormalizedFormConfig } from '@schema-engine/forms';
import type { FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { getViewRecipe } from '@schema-engine/forms/recipes';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { collectFormInitialValues, ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';
import type { FormAction, FormSubmitContext } from '@/adapters/types';
import { feedInstanceCallbacks } from '@/lib/instance-callbacks';
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
 * it. The element re-attaches `engine` as a property, mirroring `RuiForm`'s `prop:resolver`, and the callbacks reach it
 * through `ref` and {@link feedInstanceCallbacks}, not through properties: it has none for an application to assign, and
 * a form rendered on the server has no callback until the application renders it with one. The server's snapshot of the form
 * (`hydration`) is serialized with the instance, and the rows it renders carry its row ids,
 * so the client starts from the state the server rendered.
 */
export function FormInstance<TValues extends FormValues = FormValues>({
	config,
	engine,
	defaultValues,
	onSubmit,
	action,
	method,
	onChange,
	onAction,
	children,
}: {
	config: NormalizedFormConfig<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>, TValues>;
	engine: CoreFormEngine;
	defaultValues?: DefaultValuesOf<TValues>;
	onSubmit?: (data: TValues, context: FormSubmitContext) => void | Promise<void>;
	action?: string;
	method?: string;
	onChange?: (data: FormValues) => void;
	onAction?: (action: FormAction, data: TValues) => void | Promise<void>;
	children?: JsxRenderable;
}): JsxRenderable {
	const initialValues = collectFormInitialValues(config, defaultValues);
	const hydration = serverHydration(config, engine, initialValues);
	return (
		<FormInstanceElement
			config={config}
			defaultValues={defaultValues}
			engine={engine}
			hydration={hydration}
			ref={(instance) => {
				if (instance) feedInstanceCallbacks(instance, { onSubmit, onChange, onAction });
			}}
		>
			<ConfiguredRuiForm config={config} layoutThemeId={engine.getLayout().id} action={action} method={method}>
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
