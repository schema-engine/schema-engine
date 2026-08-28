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
			right: 'split-screen-layout__side--right',
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
	const { config } = useLayoutContext<SplitScreenLayoutConfig>();

	const { sideContent, sidePlacement = 'left', sideWidth = 'normal', contentAlignment = 'center' } = config;

	return (
		<div className={cn('split-screen-layout', className)}>
			{sideContent ? (
				<div className={sideVariants({ width: sideWidth, placement: sidePlacement })}>
					<div className="split-screen-layout__side-content">{sideContent}</div>
				</div>
			) : null}
			<div className={mainVariants({ alignment: contentAlignment })}>{children}</div>
		</div>
	);
};
