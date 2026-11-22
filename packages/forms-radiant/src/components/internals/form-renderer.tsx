import type { JsxRenderable } from '@ecopages/jsx';
import { assertFormEngine } from '@schema-engine/forms';
import { FormProvider } from '@/adapters/radiant/form-provider';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { FormRendererElement, type FormRendererProps } from './form-renderer.script';

export { FormRendererElement, type FormRendererProps };

/**
 * JSX view around `<se-form-renderer>`.
 *
 * @remarks
 * View-owned shell: the form tree is authored here as light-DOM children so
 * SSR expands it. The live `engine` is re-attached on the client.
 */
export function FormRenderer({
	engine,
	class: className,
	style,
	children,
	...props
}: FormRendererProps): JsxRenderable {
	const resolvedEngine = resolveFormEngine(undefined, engine);
	assertFormEngine(resolvedEngine, props.config);

	return (
		<FormRendererElement
			classes={['se-form-renderer', className]}
			style={style}
			engine={resolvedEngine}
			defaultValues={props.defaultValues}
			formatIssue={props.formatIssue}
		>
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
		</FormRendererElement>
	);
}
