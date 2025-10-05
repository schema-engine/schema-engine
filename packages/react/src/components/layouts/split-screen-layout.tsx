import type React from 'react';
import { cn } from '@/shadcn/lib/utils';
import type { BaseLayoutProps } from './types';

interface SplitScreenLayoutConfig {
	sideContent?: string;
	sidePlacement?: 'left' | 'right';
	sideWidth?: 'narrow' | 'normal' | 'wide';
}

/**
 * Split Screen Layout
 * Displays the form content alongside additional information or media
 */
export const SplitScreenLayout: React.FC<BaseLayoutProps> = ({ children, config, step, className }) => {
	const splitConfig = config as SplitScreenLayoutConfig | undefined;
	const { sideContent = 'Welcome!', sidePlacement = 'left', sideWidth = 'normal' } = splitConfig || {};

	const isLeftSide = sidePlacement === 'left';

	const widthClass =
		{
			narrow: 'split-screen-layout__side--narrow',
			normal: 'split-screen-layout__side--normal',
			wide: 'split-screen-layout__side--wide',
		}[sideWidth] || 'split-screen-layout__side--normal';

	return (
		<div className={cn('split-screen-layout', className)}>
			{isLeftSide && (
				<div className={cn('split-screen-layout__side', widthClass)}>
					<h2 className="split-screen-layout__step-counter">
						Step {step.index + 1} of {step.total}
					</h2>
					{step.title && <h3 className="split-screen-layout__step-title">{step.title}</h3>}
					{step.description && <p className="split-screen-layout__step-description">{step.description}</p>}
					<div className="split-screen-layout__side-content">{sideContent}</div>
				</div>
			)}

			<div className="split-screen-layout__main">{children}</div>

			{!isLeftSide && (
				<div className={cn('split-screen-layout__side', widthClass)}>
					<h2 className="split-screen-layout__step-counter">
						Step {step.index + 1} of {step.total}
					</h2>
					{step.title && <h3 className="split-screen-layout__step-title">{step.title}</h3>}
					{step.description && <p className="split-screen-layout__step-description">{step.description}</p>}
					<div className="split-screen-layout__side-content">{sideContent}</div>
				</div>
			)}
		</div>
	);
};
