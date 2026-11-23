/** @jsxImportSource react */
import { useState } from 'react';
import type { FormConfig, FormEngineRuntime } from '@schema-engine/forms';
import { FormEngineProvider, FormRenderer } from '@schema-engine/forms-react';

/**
 * A form with the result region the docs demos show after a valid submit.
 *
 * @remarks
 * The server render and the client hydration both render this component, so the markup they produce
 * matches. The result is the submitted values, which stay in the page: nothing is sent anywhere.
 */
export function ReactFormContent({ config, engine }: { config: FormConfig; engine: FormEngineRuntime }) {
	const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(null);

	return (
		<FormEngineProvider engine={engine}>
			<FormRenderer config={config} engine={engine} onSubmit={setSubmitted} />
			{submitted ? (
				<output className="docs-react-form-result" data-se-demo-result>
					<strong>Form submitted successfully.</strong>
					<pre>{JSON.stringify(submitted, null, 2)}</pre>
				</output>
			) : null}
		</FormEngineProvider>
	);
}
