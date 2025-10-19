import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import type { SplitScreenLayoutConfig, SplitScreenLayoutProps } from './split-screen-layout.types';
import { useLayoutContext } from '@/contexts/layout-context';
import type React from 'react';

const sideVariants = cva('split-screen-layout__side', {
	variants: {
		width: {
			narrow: 'split-screen-layout__side--narrow',
			normal: 'split-screen-layout__side--normal',
			wide: 'split-screen-layout__side--wide',
		},
		placement: {
			left: '',
			right: 'md:order-last',
		},
	},
	defaultVariants: {
		width: 'normal',
		placement: 'left',
	},
});

const mainVariants = cva('split-screen-layout__main', {
	variants: {
		alignment: {
			top: 'split-screen-layout__main--top',
			center: 'split-screen-layout__main--center',
			bottom: 'split-screen-layout__main--bottom',
		},
	},
	defaultVariants: {
		alignment: 'center',
	},
});

/**
 * Split Screen Layout
 * Displays the form content alongside additional information or media
 * Supports both single-step and multi-step forms
 * Loads configuration from global context
 */
export const SplitScreenLayout: React.FC<SplitScreenLayoutProps> = ({ children, className }) => {
	const { step, form, config } = useLayoutContext<SplitScreenLayoutConfig>();

	const { sideContent, sidePlacement = 'left', sideWidth = 'normal', contentAlignment = 'center' } = config;

	const title = step?.title || form.title;
	const description = step?.description || form.description;

	return (
		<div className={cn('split-screen-layout', className)}>
			<div className={sideVariants({ width: sideWidth, placement: sidePlacement })}>
				{typeof step.index === 'number' && typeof step.total === 'number' ? (
					<h2 className="split-screen-layout__step-counter">
						Step {step.index + 1} of {step.total}
					</h2>
				) : null}
				{title ? <h3 className="split-screen-layout__step-title">{title}</h3> : null}
				{description ? <p className="split-screen-layout__step-description">{description}</p> : null}
				<div className="split-screen-layout__side-content">{sideContent}</div>
			</div>
			<div className={mainVariants({ alignment: contentAlignment })}>{children as React.ReactNode}</div>
		</div>
	);
};

import type { LayoutRegistration } from '@json-form-engine/core/types';
import { SplitScreenLayoutConfigSchema } from './split-screen-layout.types';

export const SplitScreenLayoutRegistration: LayoutRegistration<SplitScreenLayoutConfig, SplitScreenLayoutProps> = {
	$type: 'split-screen',
	render: SplitScreenLayout,
	schema: SplitScreenLayoutConfigSchema,
	metadata: {
		name: 'Split Screen Layout',
		description: 'Two-column layout with side content and main form area',
		icon: 'layout-split',
	},
};
