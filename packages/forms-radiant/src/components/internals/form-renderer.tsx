import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { assertFormEngine } from '@schema-engine/forms';
import { FormProvider } from '@/adapters/radiant/form-provider';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import type { FormRendererProps } from './form-renderer.script';

export { FormRendererElement, type FormRendererProps } from './form-renderer.script';

/**
 * JSX view around `<se-form-renderer>`.
 *
 * @remarks
 * View-owned shell: the form tree is authored here as light-DOM children so
 * SSR expands it. Live objects (`engine`, `onSubmit`) are re-attached on the
 * client.
 */
export function FormRenderer({ engine, className, style, children, ...props }: FormRendererProps): JsxRenderable {
	const resolvedEngine = resolveFormEngine(undefined, engine);
	assertFormEngine(resolvedEngine, props.config);

	return jsx('se-form-renderer', {
		classes: ['se-form-renderer', className],
		style,
		config: props.config,
		'prop:engine': resolvedEngine,
		defaultValues: props.defaultValues,
		'prop:onSubmit': props.onSubmit,
		children: (
			<FormProvider
				config={props.config}
				defaultValues={props.defaultValues}
				onSubmit={props.onSubmit}
				engine={resolvedEngine}
			>
				{children}
			</FormProvider>
		),
	});
}
