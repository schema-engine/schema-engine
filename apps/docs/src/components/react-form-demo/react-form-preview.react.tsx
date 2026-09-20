/** @jsxImportSource react */
import type { ReactNode } from 'react';
import { FormEngineProvider, FormRenderer } from '@schema-engine/forms-react';
import { eco } from '@ecopages/core';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { docsReactFormEngine, rhfAdapter } from './demo-engine';
import { installMockFormApi } from '@/lib/mock-form-api';
import './demo-recipes.css';

/**
 * Live React form preview for docs demos.
 *
 * @remarks
 * The docs app defaults to Ecopages JSX (`jsxImportSource: @ecopages/jsx`), so
 * this module and sibling `*.react.tsx` demo sources declare `@jsxImportSource
 * react` for `@schema-engine/forms-react` `FormRenderer`. The docs catch-all page
 * merges this registration into its browser graph for `forms-react/*` entries so
 * the client hydration script ships on the route. Radiant live previews use
 * {@link FormRendererPreview} from `@/components/form-renderer` instead and do
 * not need a React pragma.
 */
function Preview({ config, onSubmit }: { config: FormConfig; onSubmit?: (data: Record<string, unknown>) => void }) {
	return (
		<FormEngineProvider engine={docsReactFormEngine} adapter={rhfAdapter}>
			<FormRenderer config={config} engine={docsReactFormEngine} adapter={rhfAdapter} onSubmit={onSubmit} />
		</FormEngineProvider>
	);
}

export const ReactFormPreview = eco.component<
	{ config: FormConfig; onSubmit?: (data: Record<string, unknown>) => void },
	ReactNode
>({
	render: (props) => {
		installMockFormApi();
		return <Preview {...props} />;
	},
});
