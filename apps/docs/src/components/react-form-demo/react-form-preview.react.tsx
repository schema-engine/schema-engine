/** @jsxImportSource react */
import type { ReactNode } from 'react';
import { eco } from '@ecopages/core';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { docsReactFormEngine } from './demo-engine';
import { ReactFormContent } from './react-form-content.react';
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
 *
 * The copied shadcn source renders through `ShadcnFormPreview`, which only the pages that show it load.
 */
export const ReactFormPreview = eco.component<{ config: FormConfig }, ReactNode>({
	render: ({ config }) => {
		installMockFormApi();
		return <ReactFormContent config={config} engine={docsReactFormEngine} />;
	},
});
