/** @jsxImportSource react */
import type { ElementType } from 'react';
import { formatStepCounter, type StepHeaderConfig } from '@schema-engine/forms/recipes';
import { useActiveStep, useViewConfig, useViewContext } from '@schema-engine/forms-react/contexts';
import { cn } from '@/components/schema-engine/forms/lib/utils';

const titleSizes = {
	sm: 'text-xl',
	md: 'text-2xl',
	lg: 'text-4xl',
} as const;

const alignments = {
	start: 'text-left',
	center: 'text-center',
	end: 'text-right',
} as const;

export function StepHeader() {
	const { form } = useViewContext();
	const step = useActiveStep();
	const {
		showDescription = true,
		showStepCounter = false,
		labels,
		size = 'md',
		align = 'start',
		titleAs = 'h2',
		inheritColor = false,
		counterPlacement = 'after',
	} = useViewConfig<StepHeaderConfig>('header');

	const title = step.title || form.title;
	const description = step.description || form.description;
	const counterText = showStepCounter
		? labels?.stepCounter
			? formatStepCounter(labels.stepCounter, step.index + 1, step.total)
			: `Step ${step.index + 1} of ${step.total}`
		: null;
	const Title = titleAs as ElementType;

	if (!title && !description && !counterText) return null;

	return (
		<header className={cn('max-w-none space-y-2', alignments[align], inheritColor && 'text-inherit')}>
			{counterText && counterPlacement === 'before' ? (
				<p className={cn('text-sm text-muted-foreground', inheritColor && 'text-inherit opacity-80')}>
					{counterText}
				</p>
			) : null}
			{title ? <Title className={cn('font-bold tracking-tight', titleSizes[size])}>{title}</Title> : null}
			{showDescription && description ? (
				<p className={cn('text-muted-foreground', inheritColor && 'text-inherit opacity-80')}>{description}</p>
			) : null}
			{counterText && counterPlacement === 'after' ? (
				<p className={cn('text-sm text-muted-foreground', inheritColor && 'text-inherit opacity-80')}>
					{counterText}
				</p>
			) : null}
		</header>
	);
}
