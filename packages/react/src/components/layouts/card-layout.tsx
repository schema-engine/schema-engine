import type React from 'react';
import { cn } from '@/shadcn/lib/utils';
import type { BaseLayoutProps } from './types';

interface CardLayoutConfig {
	maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
	padding?: 'sm' | 'md' | 'lg';
	shadowSize?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Card Layout
 * Displays form content in a centered card
 */
export const CardLayout: React.FC<BaseLayoutProps> = ({ children, config, step, className }) => {
	const cardConfig = config as CardLayoutConfig | undefined;
	const { maxWidth = 'md', padding = 'md', shadowSize = 'md' } = cardConfig || {};

	const maxWidthClass =
		{
			sm: 'card-layout__card--sm',
			md: 'card-layout__card--md',
			lg: 'card-layout__card--lg',
			xl: 'card-layout__card--xl',
		}[maxWidth] || 'card-layout__card--md';

	const paddingClass =
		{
			sm: 'card-layout__padding--sm',
			md: 'card-layout__padding--md',
			lg: 'card-layout__padding--lg',
		}[padding] || 'card-layout__padding--md';

	const shadowClass =
		{
			sm: 'card-layout__shadow--sm',
			md: 'card-layout__shadow--md',
			lg: 'card-layout__shadow--lg',
			xl: 'card-layout__shadow--xl',
		}[shadowSize] || 'card-layout__shadow--md';

	return (
		<div className={cn('card-layout', className)}>
			<div className={cn('card-layout__card', maxWidthClass, shadowClass)}>
				<div className={`card-layout__header ${paddingClass}`}>
					<h2 className="card-layout__title">{step.title}</h2>
					{step.description && <p className="card-layout__description">{step.description}</p>}
					<small className="card-layout__step-counter">
						Step {step.index + 1} of {step.total}
					</small>
				</div>

				<div className={`card-layout__content ${paddingClass}`}>{children}</div>
			</div>
		</div>
	);
};
