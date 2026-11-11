import type { ElementType } from 'react';
import { formatStepCounter, StepHeaderConfigSchema } from '@schema-engine/forms/recipes/built-in';
import { useActiveStep, useViewConfig, useViewContext } from '@schema-engine/forms-react/hooks';
import { cn } from '@/components/schema-engine/forms/lib/utils';

const titleSizes = {
	sm: 'text-xl',
	md: 'text-2xl',
	lg: 'text-4xl',
} as const;

const alignments = {
	start: 'text-left',
	center: 'text-center',
} as const;

export function StepHeader() {
	const { form } = useViewContext();
	const step = useActiveStep();
	const {
		showDescription,
		showStepCounter,
		labels,
		size,
		align,
		fallbackToFormTitle,
		titleAs,
		inheritColor,
		counterPlacement,
	} = useViewConfig('header', StepHeaderConfigSchema);

	const title = step.title || (fallbackToFormTitle ? form.title : undefined);
	const description = step.description || form.description;
	const counterText = showStepCounter ? formatStepCounter(labels.stepCounter, step.index + 1, step.total) : null;
	const Title = titleAs as ElementType;

	if (!title && !description && !counterText) return null;

	return (
		<header
			data-align={align}
			className={cn('max-w-none space-y-2', alignments[align], inheritColor && 'text-inherit')}
		>
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
