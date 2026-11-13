import type { JsxRenderable } from '@ecopages/jsx';
import type { FormConfig } from '@schema-engine/forms/schemas';

/** Which engine the client hydrates a demo root with. */
export type ReactDemoKit = 'demo' | 'shadcn';

/**
 * The element a React live demo mounts into, shared by the embeds.
 *
 * @remarks
 * Ecopages JSX owns this root so static builds emit the serialized config and hydration markers
 * Ecopages React islands omit on cross-integration embeds. The client hydration script finds the
 * root by `data-se-react-form-demo-root` and reads the config and kit from its attributes.
 */
export function ReactFormDemoRoot({
	config,
	kit,
	children,
}: {
	config: FormConfig;
	kit: ReactDemoKit;
	children: JsxRenderable;
}) {
	return (
		<div
			class="not-prose unstyled docs-react-form-demo"
			data-se-react-form-demo-root="true"
			data-se-form-config={JSON.stringify(config)}
			data-se-react-form-demo-kit={kit}
		>
			{children}
		</div>
	);
}
