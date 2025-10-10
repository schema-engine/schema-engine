import type React from 'react';
import type { FormStep } from '@json-form-engine/core';
import type { StepLayoutConfig } from '@json-form-engine/core/schemas/form-config';
import { useFormEngine } from '@/hooks';
import { LayoutProvider } from '@/contexts/layout-context';

interface LayoutRendererProps {
	/**
	 * The step configuration containing layout information
	 */
	step: FormStep & { layout?: StepLayoutConfig };

	/**
	 * Current step metadata (undefined for single-step forms where navigation is not needed)
	 */
	stepMeta?: {
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
 * Supports both single-step and multi-step forms
 */
const DefaultLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return <div className="form-step-content">{children}</div>;
};

/**
 * Layout Renderer Component
 *
 * Resolves and renders the appropriate layout component based on the step configuration.
 * Falls back to a default layout if none is specified or if the layout is not found.
 */
export const LayoutRenderer: React.FC<LayoutRendererProps> = ({ step, stepMeta, formMeta, children }) => {
	const { engine } = useFormEngine();

	const contextValue = {
		step: stepMeta
			? {
					id: step.id,
					title: step.title,
					description: step.description,
					index: stepMeta.index,
					total: stepMeta.total,
				}
			: {
					id: step.id,
					title: step.title,
					description: step.description,
				},
		form: formMeta,
		config: step.layout || {},
	};

	if (!step.layout?.layoutId) {
		return (
			<LayoutProvider value={contextValue}>
				<DefaultLayout>{children}</DefaultLayout>
			</LayoutProvider>
		);
	}

	const { layoutId, ...layoutConfig } = step.layout;

	const layoutRegistration = engine.getLayout(layoutId);

	if (!layoutRegistration) {
		console.warn(`Layout '${layoutId}' not found in registry. Using default layout.`);
		return (
			<LayoutProvider value={{ ...contextValue, config: layoutConfig }}>
				<DefaultLayout>{children}</DefaultLayout>
			</LayoutProvider>
		);
	}

	const LayoutComponent = layoutRegistration.render as React.ComponentType<{ children: React.ReactNode }>;

	return (
		<LayoutProvider value={{ ...contextValue, config: layoutConfig }}>
			<LayoutComponent>{children}</LayoutComponent>
		</LayoutProvider>
	);
};

export default LayoutRenderer;
