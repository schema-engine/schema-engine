/** @jsxImportSource react */
import type { ReactNode } from 'react';
import { eco } from '@ecopages/core';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { docsReactFormEngine } from './demo-engine';
import { ReactFormContent, type ReactDemoKit } from './react-form-content.react';
import { docsShadcnFormEngine } from './shadcn-engine';
import { installMockFormApi } from '@/lib/mock-form-api';
import './demo-recipes.css';
import '@/generated/shadcn/components/schema-engine/forms/recipes/recipes.css';
import '@/generated/shadcn/components/ui/schema-engine/components/controls.css';

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
 *
 * `kit="shadcn"` renders with the copied registry source instead of the Radiant-styled demo kit.
 */
export const ReactFormPreview = eco.component<{ config: FormConfig; kit?: ReactDemoKit }, ReactNode>({
	render: ({ config, kit = 'demo' }) => {
		installMockFormApi();
		return (
			<ReactFormContent config={config} engine={kit === 'shadcn' ? docsShadcnFormEngine : docsReactFormEngine} />
		);
	},
});
