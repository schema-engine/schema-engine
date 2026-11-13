import type { CSSProperties } from 'react';
import { formatStepLabel, MinimalProgressConfigSchema } from '@schema-engine/forms/recipes/built-in';
import { useViewConfig, useViewContext } from '@schema-engine/forms-react/hooks';

/**
 * @remarks
 * A custom progress bar rather than a landmark or a `meter`: the form is partway through a
 * task, not navigating, and the value is a step position. The track and fill are presentational;
 * the visible percentage is hidden from assistive technology because `aria-valuetext` already
 * announces the step. The bar is named by the visible label so the two cannot drift apart.
 */
export function MinimalProgress() {
	const { form, steps, currentStepIndex } = useViewContext();
	const { showPercentage, labels } = useViewConfig('progress', MinimalProgressConfigSchema);

	const labelId = `${form.id}-progress-label`;
	const progressValue = Math.round(((currentStepIndex + 1) / steps.length) * 100);
	const fillStyle: CSSProperties & Record<'--se-progress', string> = { '--se-progress': `${progressValue}%` };

	return (
		<div className="se-minimal-progress">
			<div className="se-minimal-progress__labels text-sm">
				<span id={labelId}>{labels.progress}</span>
				{showPercentage ? (
					<span aria-hidden className="text-muted-foreground tabular-nums">
						{progressValue}%
					</span>
				) : null}
			</div>
			<div
				role="progressbar"
				aria-labelledby={labelId}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={progressValue}
				aria-valuetext={formatStepLabel(labels.valueText, currentStepIndex + 1, steps.length)}
				className="se-minimal-progress__track bg-secondary"
			>
				<div aria-hidden className="se-minimal-progress__fill bg-primary" style={fillStyle} />
			</div>
		</div>
	);
}
