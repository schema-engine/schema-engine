/** @jsxImportSource react */
import type { ReactNode } from 'react';
import { FormEngineProvider, FormRenderer } from '@schema-engine/forms-react';
import { eco } from '@ecopages/core';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { docsReactFormEngine, rhfAdapter } from './demo-engine';
import { installMockFormApi } from '@/lib/mock-form-api';

/**
 * Live React form preview for docs demos.
 *
 * @remarks
 * The form configuration is declared inline in the demo page and passed as a
 * prop, so the documented snippet and the interactive demo share the same data.
 * Uses the small Radiant-styled demo kit — not the shadcn registry — and no
 * extra stylesheet: the docs shell already loads `@ecopages/radiant-ui/styles.css`.
 */
function Preview({ config, onSubmit }: { config: FormConfig; onSubmit?: (data: Record<string, unknown>) => void }) {
	return (
		<div className="not-prose unstyled docs-react-form-demo">
			<FormEngineProvider engine={docsReactFormEngine} adapter={rhfAdapter}>
				<FormRenderer config={config} engine={docsReactFormEngine} adapter={rhfAdapter} onSubmit={onSubmit} />
			</FormEngineProvider>
		</div>
	);
}

export const ReactFormPreview = eco.component<
	{ config: FormConfig; onSubmit?: (data: Record<string, unknown>) => void },
	ReactNode
>({
	dependencies: { stylesheets: ['./demo-recipes.css'] },
	render: (props) => {
		installMockFormApi();
		return <Preview {...props} />;
	},
});
