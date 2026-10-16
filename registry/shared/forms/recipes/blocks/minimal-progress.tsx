import type { MinimalProgressConfig } from '@schema-engine/forms/recipes';
import { useViewConfig, useViewContext } from '@schema-engine/forms-react/hooks';
import { Progress } from '@/components/ui/progress';

export function MinimalProgress() {
	const { steps, currentStepIndex } = useViewContext();
	const { showPercentage = true, labels } = useViewConfig<MinimalProgressConfig>('progress');

	if (!showPercentage) return null;

	const progressValue = ((currentStepIndex + 1) / steps.length) * 100;
	const progressLabel = labels?.progress ?? 'Progress';
	const regionLabel = labels?.regionAriaLabel ?? 'Form progress';

	return (
		<nav aria-label={regionLabel} className="w-full space-y-2">
			<div className="flex items-center justify-between text-sm">
				<span>{progressLabel}</span>
				<span className="text-muted-foreground tabular-nums">{Math.round(progressValue)}%</span>
			</div>
			<Progress value={progressValue} />
		</nav>
	);
}
