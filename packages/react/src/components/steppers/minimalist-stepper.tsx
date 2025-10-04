import type { StepperComponent } from './types';

export interface MinimalistStepperConfig {
	showProgress?: boolean;
	primaryColor?: string;
}

/**
 * Minimalist Stepper
 * This is a simple text-based stepper with optional progress bar
 * It focuses on clarity and ease of use
 */
export const MinimalistStepper: StepperComponent<MinimalistStepperConfig> = ({
	steps,
	currentStepIndex,
	navigation,
	config,
	form,
	children,
}) => {
	const minimalistConfig = config as MinimalistStepperConfig | undefined;
	const showProgress = minimalistConfig?.showProgress !== false;
	const primaryColor = minimalistConfig?.primaryColor || '#3b82f6';

	return (
		<div className="minimalist-stepper">
			<div className="minimalist-stepper__header">
				{showProgress && (
					<div className="minimalist-stepper__progress">
						<div className="minimalist-stepper__progress-info">
							<span>Progress</span>
							<span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}% complete</span>
						</div>
						<div className="minimalist-stepper__progress-bar">
							<div
								className="minimalist-stepper__progress-fill"
								style={{
									backgroundColor: primaryColor,
									width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
								}}
							/>
						</div>
					</div>
				)}

				<div>
					<div className="minimalist-stepper__step-info">
						Step {currentStepIndex + 1} of {steps.length}
					</div>
					<h2 className="minimalist-stepper__title">
						{steps[currentStepIndex]?.title || `Step ${currentStepIndex + 1}`}
					</h2>
					{steps[currentStepIndex]?.description && (
						<p className="minimalist-stepper__description">{steps[currentStepIndex].description}</p>
					)}
				</div>
			</div>

			<div className="minimalist-stepper__content">{children}</div>

			<div className="minimalist-stepper__navigation">
				<button
					type="button"
					onClick={() => navigation.goToPreviousStep()}
					disabled={navigation.isFirstStep}
					className={`minimalist-stepper__nav-button minimalist-stepper__nav-button--text ${
						navigation.isFirstStep ? 'minimalist-stepper__nav-button--text--disabled' : ''
					}`}
				>
					← Previous
				</button>

				{navigation.isLastStep ? (
					<button
						type="submit"
						className="minimalist-stepper__nav-button minimalist-stepper__nav-button--primary"
						style={{ backgroundColor: primaryColor }}
					>
						{form.isSubmitting ? 'Submitting...' : 'Submit'}
					</button>
				) : (
					<button
						type="button"
						onClick={() => navigation.goToNextStep()}
						disabled={!navigation.canGoNext}
						className={`minimalist-stepper__nav-button minimalist-stepper__nav-button--primary ${
							!navigation.canGoNext ? 'minimalist-stepper__nav-button--primary--disabled' : ''
						}`}
						style={{ backgroundColor: primaryColor }}
					>
						Next →
					</button>
				)}
			</div>
		</div>
	);
};
