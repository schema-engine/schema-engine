import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import { getSlotConfig, type CardShellConfig } from '@schema-engine/forms/recipes';
import type { FormShellProps } from '@/recipes/types';
import './card-shell.css';

const cardVariants = cva('card-shell__card', {
	variants: {
		maxWidth: {
			sm: 'card-shell__card--sm',
			md: 'card-shell__card--md',
			lg: 'card-shell__card--lg',
			xl: 'card-shell__card--xl',
		},
		shadow: {
			sm: 'card-shell__shadow--sm',
			md: 'card-shell__shadow--md',
			lg: 'card-shell__shadow--lg',
			xl: 'card-shell__shadow--xl',
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
			sm: 'card-shell__padding--sm',
			md: 'card-shell__padding--md',
			lg: 'card-shell__padding--lg',
		},
	},
	defaultVariants: {
		padding: 'md',
	},
});

export function CardShell({ slots, viewConfig }: FormShellProps) {
	const { maxWidth = 'md', padding = 'md', shadowSize = 'md' } = getSlotConfig<CardShellConfig>(viewConfig, 'shell');

	return (
		<div className="card-shell">
			<div className={cardVariants({ maxWidth, shadow: shadowSize })}>
				{slots.header ? (
					<div className={cn('card-shell__header', paddingVariants({ padding }))}>{slots.header}</div>
				) : null}
				<div className={cn('card-shell__content', paddingVariants({ padding }))}>
					{slots.progress}
					{slots.content}
					{slots.actions}
				</div>
			</div>
		</div>
	);
}
