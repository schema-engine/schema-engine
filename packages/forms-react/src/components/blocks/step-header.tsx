import { Heading, HeadingDescription, HeadingEyebrow, HeadingTitle } from '@/components/ui/heading';
import { useActiveStep, useViewConfig, useViewContext } from '@/contexts/view-context';
import { formatStepCounter, type StepHeaderConfig } from '@schema-engine/forms/recipes';

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
	const showCounter = showStepCounter;
	const counterText = showCounter
		? labels?.stepCounter
			? formatStepCounter(labels.stepCounter, step.index + 1, step.total)
			: `Step ${step.index + 1} of ${step.total}`
		: null;

	if (!title && !description && !showCounter) return null;

	return (
		<Heading
			size={size}
			align={align}
			className={
				inheritColor
					? 'max-w-none text-inherit [&_[data-slot=heading-description]]:text-inherit [&_[data-slot=heading-description]]:opacity-80 [&_[data-slot=heading-eyebrow]]:text-inherit [&_[data-slot=heading-eyebrow]]:opacity-80'
					: undefined
			}
		>
			{counterText && counterPlacement === 'before' ? <HeadingEyebrow>{counterText}</HeadingEyebrow> : null}
			{title ? <HeadingTitle as={titleAs}>{title}</HeadingTitle> : null}
			{showDescription && description ? <HeadingDescription>{description}</HeadingDescription> : null}
			{counterText && counterPlacement === 'after' ? <HeadingEyebrow>{counterText}</HeadingEyebrow> : null}
		</Heading>
	);
}
