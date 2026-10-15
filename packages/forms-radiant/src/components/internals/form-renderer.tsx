import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { FormProvider } from '@/adapters/radiant/form-provider';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { radiantAdapter } from '@/adapters/radiant';
import type { FormRendererProps } from './form-renderer.script';

export { FormRendererElement, type FormRendererProps } from './form-renderer.script';

/**
 * JSX view around `<se-form-renderer>`.
 *
 * @remarks
 * View-owned shell: the form tree is authored here as light-DOM children so
 * SSR expands it. Live objects (`engine`, `adapter`, `onSubmit`) default to
 * the active engine and radiant adapter, and auto-wire on the client.
 */
export function FormRenderer({
	engine,
	adapter,
	className,
	style,
	children,
	...props
}: FormRendererProps): JsxRenderable {
	const resolvedEngine = resolveFormEngine(undefined, engine);
	const resolvedAdapter = adapter ?? radiantAdapter;

	if (!resolvedEngine || !resolvedAdapter) {
		if (props.config.view) {
			throw new Error('FormRenderer requires an engine when config.view is set.');
		}
		return (
			<div classes={['se-form-renderer', className]} style={style}>
				<FormProvider {...props} engine={resolvedEngine}>
					{children}
				</FormProvider>
			</div>
		);
	}

	return jsx('se-form-renderer', {
		classes: ['se-form-renderer', className],
		style,
		'prop:engine': resolvedEngine,
		'prop:adapter': resolvedAdapter,
		defaultValues: props.defaultValues,
		'prop:onSubmit': props.onSubmit,
		children: (
			<FormProvider
				config={props.config}
				defaultValues={props.defaultValues}
				onSubmit={props.onSubmit}
				onChange={props.onChange}
				onAction={props.onAction}
				engine={resolvedEngine}
			>
				{children}
			</FormProvider>
		),
	});
}
