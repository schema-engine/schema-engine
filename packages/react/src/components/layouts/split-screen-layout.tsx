import { cn } from '@/shadcn/lib/utils';
import type { SplitScreenLayoutConfig, SplitScreenLayoutProps } from './split-screen-layout.types';
import { useLayoutContext } from '@/contexts/layout-context';
import type React from 'react';

/**
 * Split Screen Layout
 * Displays the form content alongside additional information or media
 * Supports both single-step and multi-step forms
 * Loads configuration from global context
 */
export const SplitScreenLayout: React.FC<SplitScreenLayoutProps> = ({ children, className }) => {
	const { step, form, config } = useLayoutContext<SplitScreenLayoutConfig>();

	const { sideContent, sidePlacement = 'left', sideWidth = 'normal', contentAlignment = 'top' } = config;

	const isLeftSide = sidePlacement === 'left';

	const widthClass =
		{
			narrow: 'split-screen-layout__side--narrow',
			normal: 'split-screen-layout__side--normal',
			wide: 'split-screen-layout__side--wide',
		}[sideWidth] || 'split-screen-layout__side--normal';

	const alignmentClass =
		{
			top: 'split-screen-layout__main--top',
			center: 'split-screen-layout__main--center',
			bottom: 'split-screen-layout__main--bottom',
		}[contentAlignment] || 'split-screen-layout__main--top';

	const title = step?.title || form.title;
	const description = step?.description || form.description;

	const sidePanel = (
		<div className={cn('split-screen-layout__side', widthClass)}>
			{typeof step.index === 'number' && typeof step.total === 'number' ? (
				<h2 className="split-screen-layout__step-counter">
					Step {step.index + 1} of {step.total}
				</h2>
			) : null}
			{title ? <h3 className="split-screen-layout__step-title">{title}</h3> : null}
			{description ? <p className="split-screen-layout__step-description">{description}</p> : null}
			<div className="split-screen-layout__side-content">{sideContent}</div>
		</div>
	);

	return (
		<div className={cn('split-screen-layout', className)}>
			{isLeftSide && sidePanel}
			<div className={cn('split-screen-layout__main', alignmentClass)}>{children as React.ReactNode}</div>
			{!isLeftSide && sidePanel}
		</div>
	);
};

import type { LayoutRegistration } from '@json-form-engine/core/types';
import { SplitScreenLayoutConfigSchema } from './split-screen-layout.types';

export const SplitScreenLayoutRegistration: LayoutRegistration<SplitScreenLayoutConfig, SplitScreenLayoutProps> = {
	layoutId: 'split-screen',
	render: SplitScreenLayout,
	schema: SplitScreenLayoutConfigSchema,
	metadata: {
		name: 'Split Screen Layout',
		description: 'Two-column layout with side content and main form area',
		icon: 'layout-split',
	},
};
