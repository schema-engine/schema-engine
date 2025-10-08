import { cn } from '@/shadcn/lib/utils';
import type { LayoutComponent } from './types';

interface SplitScreenLayoutConfig {
	sideContent?: string;
	sidePlacement?: 'left' | 'right';
	sideWidth?: 'narrow' | 'normal' | 'wide';
	contentAlignment?: 'top' | 'center' | 'bottom';
}

/**
 * Split Screen Layout
 * Displays the form content alongside additional information or media
 * Supports both single-step and multi-step forms
 */
export const SplitScreenLayout: LayoutComponent<SplitScreenLayoutConfig> = ({
	children,
	config,
	step,
	form,
	className,
}) => {
	const {
		sideContent = 'Welcome!',
		sidePlacement = 'left',
		sideWidth = 'normal',
		contentAlignment = 'top',
	} = config || {};

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
			{step && (
				<h2 className="split-screen-layout__step-counter">
					Step {step.index + 1} of {step.total}
				</h2>
			)}
			{title && <h3 className="split-screen-layout__step-title">{title}</h3>}
			{description && <p className="split-screen-layout__step-description">{description}</p>}
			<div className="split-screen-layout__side-content">{sideContent}</div>
		</div>
	);

	return (
		<div className={cn('split-screen-layout', className)}>
			{isLeftSide && sidePanel}
			<div className={cn('split-screen-layout__main', alignmentClass)}>{children}</div>
			{!isLeftSide && sidePanel}
		</div>
	);
};
