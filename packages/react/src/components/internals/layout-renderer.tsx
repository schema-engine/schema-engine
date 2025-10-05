import type React from 'react';
import type { FormStep } from '@json-form-engine/core';
import type { StepLayoutConfig } from '@json-form-engine/core/schemas/form-config';
import type { BaseLayoutProps } from '../layouts/types';
import { reactLayoutRegistry } from '@/registries/layout-registry';

interface LayoutRendererProps {
	/**
	 * The step configuration containing layout information
	 */
	step: FormStep & { layout?: StepLayoutConfig };

	/**
	 * Current step metadata
	 */
	stepMeta: {
		index: number;
		total: number;
	};

	/**
	 * Form metadata
	 */
	formMeta: {
		id: string;
		title?: string;
		description?: string;
	};

	/**
	 * Content to be wrapped by the layout
	 */
	children: React.ReactNode;
}

/**
 * Default layout component that simply renders children
 */
const DefaultLayout: React.FC<BaseLayoutProps> = ({ children }) => {
	return <div className="form-step-content">{children}</div>;
};

/**
 * Layout Renderer Component
 *
 * Resolves and renders the appropriate layout component based on the step configuration.
 * Falls back to a default layout if none is specified or if the layout is not found.
 */
export const LayoutRenderer: React.FC<LayoutRendererProps> = ({ step, stepMeta, formMeta, children }) => {
	if (!step.layout?.__layoutId) {
		return (
			<DefaultLayout config={{}} step={{ ...step, ...stepMeta }} form={formMeta}>
				{children}
			</DefaultLayout>
		);
	}

	const { __layoutId, ...layoutConfig } = step.layout;

	const layoutResult = reactLayoutRegistry.getLayoutWithConfig(__layoutId, layoutConfig);

	if (!layoutResult) {
		console.warn(`Layout '${__layoutId}' not found in registry. Using default layout.`);
		return (
			<DefaultLayout config={layoutConfig} step={{ ...step, ...stepMeta }} form={formMeta}>
				{children}
			</DefaultLayout>
		);
	}

	const { component: LayoutComponent, config } = layoutResult;

	// Prepare props for the layout component
	const layoutProps: BaseLayoutProps = {
		children,
		config,
		step: {
			id: step.id,
			title: step.title,
			description: step.description,
			index: stepMeta.index,
			total: stepMeta.total,
		},
		form: formMeta,
	};

	return <LayoutComponent {...layoutProps} />;
};

export default LayoutRenderer;
