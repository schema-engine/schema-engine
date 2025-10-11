import { cn } from '@/shadcn/lib/utils';
import type { CardLayoutConfig, CardLayoutProps } from './card-layout.types';
import { useLayoutContext } from '@/contexts/layout-context';
import type React from 'react';

/**
 * Card Layout
 * Displays form content in a centered card
 * Supports both single-step and multi-step forms
 * Loads configuration from global context
 */
export const CardLayout: React.FC<CardLayoutProps> = ({ children, className }) => {
	const { step, form, config } = useLayoutContext<CardLayoutConfig>();

	const { maxWidth = 'md', padding = 'md', shadowSize = 'md' } = config;

	const maxWidthClass =
		{
			sm: 'card-layout__card--sm',
			md: 'card-layout__card--md',
			lg: 'card-layout__card--lg',
			xl: 'card-layout__card--xl',
			full: 'card-layout__card--full',
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

	const title = step?.title || form.title;
	const description = step?.description || form.description;

	return (
		<div className={cn('card-layout', className)}>
			<div className={cn('card-layout__card', maxWidthClass, shadowClass)}>
				{title || description || (typeof step.index === 'number' && typeof step.total === 'number') ? (
					<div className={`card-layout__header ${paddingClass}`}>
						{title ? <h2 className="card-layout__title">{title}</h2> : null}
						{description ? <p className="card-layout__description">{description}</p> : null}
						{typeof step.index === 'number' && typeof step.total === 'number' ? (
							<small className="card-layout__step-counter">
								Step {step.index + 1} of {step.total}
							</small>
						) : null}
					</div>
				) : null}

				<div className={`card-layout__content ${paddingClass}`}>{children}</div>
			</div>
		</div>
	);
};

import type { LayoutRegistration } from '@json-form-engine/core/types';
import { CardLayoutConfigSchema } from './card-layout.types';

export const CardLayoutRegistration: LayoutRegistration<CardLayoutConfig, CardLayoutProps> = {
	__id: 'card',
	render: CardLayout,
	schema: CardLayoutConfigSchema,
	metadata: {
		name: 'Card Layout',
		description: 'Centered card layout with shadow and customizable padding',
		icon: 'card',
	},
};
