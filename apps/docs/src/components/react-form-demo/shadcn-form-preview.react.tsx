/** @jsxImportSource react */
import type { ReactNode } from 'react';
import { eco } from '@ecopages/core';
import type { FormConfig } from '@schema-engine/forms';
import { ReactFormContent } from './react-form-content.react';
import { docsShadcnFormEngine } from './shadcn-engine';
import { installMockFormApi } from '@/lib/mock-form-api';
import '@/generated/shadcn/components/schema-engine/forms/recipes/recipes.css';
import '@/generated/shadcn/components/ui/schema-engine/components/controls.css';
import './shadcn-theme.css';

/**
 * Live React form preview rendered by the copied shadcn registry source.
 *
 * @remarks
 * Kept apart from `ReactFormPreview` so the shadcn engine, Base UI and the recipe and control
 * stylesheets ship only on the pages that merge `ShadcnFormDemoEmbed` into their dependencies
 * (`REACT_DEMO_PAGES` in the docs page).
 */
export const ShadcnFormPreview = eco.component<{ config: FormConfig }, ReactNode>({
	render: ({ config }) => {
		installMockFormApi();
		return <ReactFormContent config={config} engine={docsShadcnFormEngine} />;
	},
});
