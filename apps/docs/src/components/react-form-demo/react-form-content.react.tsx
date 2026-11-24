/** @jsxImportSource react */
import type { FormConfig, FormEngineRuntime } from '@schema-engine/forms';
import { FormEngineProvider, FormRenderer } from '@schema-engine/forms-react';

/**
 * A form for the docs demos.
 *
 * @remarks
 * The server render and the client hydration both render this component, so the markup they produce matches. A valid
 * submit shows nothing inline, as the Radiant demo does, which cannot be handed a callback in its server-rendered form:
 * a form that tells the visitor how it went does so with the `actions` of its config, which both renderers run.
 */
export function ReactFormContent({ config, engine }: { config: FormConfig; engine: FormEngineRuntime }) {
	return (
		<FormEngineProvider engine={engine}>
			<FormRenderer config={config} engine={engine} />
		</FormEngineProvider>
	);
}
