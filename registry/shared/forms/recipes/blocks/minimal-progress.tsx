import { MinimalProgressConfigSchema } from '@schema-engine/forms/recipes/built-in';
import { useViewConfig, useViewContext } from '@schema-engine/forms-react/hooks';
import { Progress } from '@/components/ui/progress';

export function MinimalProgress() {
	const { steps, currentStepIndex } = useViewContext();
	const { showPercentage, labels } = useViewConfig('progress', MinimalProgressConfigSchema);

	if (!showPercentage) return null;

	const progressValue = ((currentStepIndex + 1) / steps.length) * 100;

	return (
		<nav aria-label={labels.regionAriaLabel} className="w-full space-y-2">
			<div className="flex items-center justify-between text-sm">
				<span>{labels.progress}</span>
				<span className="text-muted-foreground tabular-nums">{Math.round(progressValue)}%</span>
			</div>
			<Progress value={progressValue} />
		</nav>
	);
}
