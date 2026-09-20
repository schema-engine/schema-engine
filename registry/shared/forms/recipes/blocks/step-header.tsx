/** @jsxImportSource react */
import type { ElementType, ReactNode } from 'react';
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

function StepHeaderCounter({
	text,
	inheritColor,
}: {
	text: string;
	inheritColor: boolean;
}): ReactNode {
	return (
		<p className={cn('text-sm text-muted-foreground', inheritColor && 'text-inherit opacity-80')}>{text}</p>
	);
}

function resolveStepCounterText(
	showStepCounter: boolean,
	labels: StepHeaderConfig['labels'],
	stepIndex: number,
	stepTotal: number,
): string | null {
	if (!showStepCounter) {
		return null;
	}
	if (labels?.stepCounter) {
		return formatStepCounter(labels.stepCounter, stepIndex, stepTotal);
	}
	return `Step ${stepIndex} of ${stepTotal}`;
}

function StepHeaderLayout({
	title,
	description,
	counterText,
	showDescription,
	size,
	align,
	titleAs,
	inheritColor,
	counterPlacement,
}: {
	title?: string;
	description?: string;
	counterText: string | null;
	showDescription: boolean;
	size: StepHeaderConfig['size'];
	align: StepHeaderConfig['align'];
	titleAs: StepHeaderConfig['titleAs'];
	inheritColor: boolean;
	counterPlacement: StepHeaderConfig['counterPlacement'];
}) {
	const Title = (titleAs ?? 'h2') as ElementType;

	return (
		<header className={cn('max-w-none space-y-2', alignments[align ?? 'start'], inheritColor && 'text-inherit')}>
			{counterText && counterPlacement === 'before' ? (
				<StepHeaderCounter text={counterText} inheritColor={inheritColor} />
			) : null}
			{title ? <Title className={cn('font-bold tracking-tight', titleSizes[size ?? 'md'])}>{title}</Title> : null}
			{showDescription && description ? (
				<p className={cn('text-muted-foreground', inheritColor && 'text-inherit opacity-80')}>{description}</p>
			) : null}
			{counterText && counterPlacement === 'after' ? (
				<StepHeaderCounter text={counterText} inheritColor={inheritColor} />
			) : null}
		</header>
	);
}

export function StepHeader() {
	const { form } = useViewContext();
	const step = useActiveStep();
	const headerConfig = useViewConfig<StepHeaderConfig>('header');
	const {
		showDescription = true,
		showStepCounter = false,
		labels,
		size = 'md',
		align = 'start',
		titleAs = 'h2',
		inheritColor = false,
		counterPlacement = 'after',
	} = headerConfig;

	const title = step.title || form.title;
	const description = step.description || form.description;
	const counterText = resolveStepCounterText(showStepCounter, labels, step.index + 1, step.total);

	if (!title && !description && !counterText) return null;

	return (
		<StepHeaderLayout
			title={title}
			description={description}
			counterText={counterText}
			showDescription={showDescription}
			size={size}
			align={align}
			titleAs={titleAs}
			inheritColor={inheritColor}
			counterPlacement={counterPlacement}
		/>
	);
}
