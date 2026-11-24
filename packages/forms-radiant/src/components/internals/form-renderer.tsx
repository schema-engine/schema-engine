import type { JsxRenderable } from '@ecopages/jsx';
import {
	assertFormEngine,
	type FormValues,
	type NormalizedFormConfig,
	type FormEngineRuntime as CoreFormEngine,
	isNormalizedFormConfig,
} from '@schema-engine/forms';
import { FormInstance } from '@/components/form-instance';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { FormRendererElement, type FormRendererProps } from './form-renderer.script';

export { FormRendererElement, type FormRendererProps };

/**
 * The normalized form of a `FormRenderer` config, which keeps the values type of a normalized config.
 *
 * @remarks
 * A normalized config is validated as it is, so it keeps the type it carries. An authoring config carries none, and
 * `FormRendererProps['config']` accepts one only where `TValues` is `FormValues`, so the form it normalizes to is
 * a form of `TValues`; the engine has no signature that says so for a generic `TValues`.
 */
function normalize<TValues extends FormValues>(
	engine: CoreFormEngine,
	config: FormRendererProps<TValues>['config'],
): NormalizedFormConfig<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>, TValues> {
	if (isNormalizedFormConfig(config)) return engine.validateForm(config);
	return engine.validateForm(config) as NormalizedFormConfig<
		Record<string, unknown>,
		Record<string, unknown>,
		Record<string, unknown>,
		TValues
	>;
}

/**
 * JSX view around `<se-form-renderer>`.
 *
 * @remarks
 * View-owned shell: the form tree is authored here as light-DOM children so
 * SSR expands it. The live `engine` is re-attached on the client.
 *
 * The typed props are the one way to receive what a form submits: a normalized config
 * (`engine.defineForm` of a literal config, or `engine.validateForm(json, { values })`) types `onSubmit`,
 * `onAction` and `defaultValues` by the values it carries.
 */
export function FormRenderer<TValues extends FormValues = FormValues>({
	engine,
	class: className,
	style,
	children,
	...props
}: FormRendererProps<TValues>): JsxRenderable {
	const resolvedEngine = resolveFormEngine(undefined, engine);
	assertFormEngine(resolvedEngine, props.config);
	const config = normalize(resolvedEngine, props.config);

	return (
		<FormRendererElement
			classes={['se-form-renderer', className]}
			style={style}
			engine={resolvedEngine}
			defaultValues={props.defaultValues}
			formatIssue={props.formatIssue}
		>
			<FormInstance<TValues>
				config={config}
				engine={resolvedEngine}
				defaultValues={props.defaultValues}
				action={props.action}
				method={props.method}
				onSubmit={props.onSubmit}
				onChange={props.onChange}
				onAction={props.onAction}
				onActionResults={props.onActionResults}
				navigate={props.navigate}
			>
				{children}
			</FormInstance>
		</FormRendererElement>
	);
}
