import { cn } from '@/shadcn/lib/utils';
import { cva } from 'class-variance-authority';
import type { CardLayoutConfig, CardLayoutProps } from './card-layout.types';
import { useLayoutContext } from '@/contexts/layout-context';
import type React from 'react';

const cardVariants = cva('card-layout__card', {
	variants: {
		maxWidth: {
			sm: 'card-layout__card--sm',
			md: 'card-layout__card--md',
			lg: 'card-layout__card--lg',
			xl: 'card-layout__card--xl',
		},
		shadow: {
			sm: 'card-layout__shadow--sm',
			md: 'card-layout__shadow--md',
			lg: 'card-layout__shadow--lg',
			xl: 'card-layout__shadow--xl',
		},
	},
	defaultVariants: {
		maxWidth: 'md',
		shadow: 'md',
	},
});

const paddingVariants = cva('', {
	variants: {
		padding: {
			sm: 'card-layout__padding--sm',
			md: 'card-layout__padding--md',
			lg: 'card-layout__padding--lg',
		},
	},
	defaultVariants: {
		padding: 'md',
	},
});

/**
 * Card Layout
 * Displays form content in a centered card
 * Supports both single-step and multi-step forms
 * Loads configuration from global context
 */
export const CardLayout: React.FC<CardLayoutProps> = ({ children, className }) => {
	const { step, form, config } = useLayoutContext<CardLayoutConfig>();

	const { maxWidth = 'md', padding = 'md', shadowSize = 'md' } = config;

	const title = step?.title || form.title;
	const description = step?.description || form.description;

	return (
		<div className={cn('card-layout', className)}>
			<div className={cardVariants({ maxWidth, shadow: shadowSize })}>
				{title || description || (typeof step.index === 'number' && typeof step.total === 'number') ? (
					<div className={cn('card-layout__header', paddingVariants({ padding }))}>
						{title ? <h2 className="card-layout__title">{title}</h2> : null}
						{description ? <p className="card-layout__description">{description}</p> : null}
						{typeof step.index === 'number' && typeof step.total === 'number' ? (
							<small className="card-layout__step-counter">
								Step {step.index + 1} of {step.total}
							</small>
						) : null}
					</div>
				) : null}

				<div className={cn('card-layout__content', paddingVariants({ padding }))}>{children}</div>
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
