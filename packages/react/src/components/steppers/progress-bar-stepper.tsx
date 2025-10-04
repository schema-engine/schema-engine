import type React from 'react';
import type { BaseStepperProps } from './types';

export interface ProgressBarStepperConfig {
	showStepNumbers?: boolean;
	showStepTitles?: boolean;
	primaryColor?: string;
	completedColor?: string;
	backgroundColor?: string;
}

export const ProgressBarStepper: React.FC<BaseStepperProps> = ({
	steps,
	currentStepIndex,
	navigation,
	config,
	form,
	children,
}) => {
	const stepperConfig = config as ProgressBarStepperConfig | undefined;
	const primaryColor = stepperConfig?.primaryColor || '#3B82F6';
	const completedColor = stepperConfig?.completedColor || '#10B981';
	const backgroundColor = stepperConfig?.backgroundColor || '#E5E7EB';
	const showStepNumbers = stepperConfig?.showStepNumbers !== false;
	const showStepTitles = stepperConfig?.showStepTitles !== false;

	return (
		<div className="progress-bar-stepper">
			<div className="progress-bar-stepper__container">
				<div className="progress-bar-stepper__progress-track">
					<div className="progress-bar-stepper__progress-bg" style={{ backgroundColor }} />

					<div
						className="progress-bar-stepper__progress-fill"
						style={{
							backgroundColor: primaryColor,
							width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
						}}
					/>

					<div className="progress-bar-stepper__steps">
						{steps.map((step, index: number) => (
							<button
								key={step.id}
								type="button"
								onClick={() => navigation.goToStep(index)}
								className={`progress-bar-stepper__step ${
									!step.isVisited && index > currentStepIndex
										? 'progress-bar-stepper__step--disabled'
										: 'progress-bar-stepper__step--clickable'
								}`}
								disabled={!step.isVisited && index > currentStepIndex}
							>
								<div
									className="progress-bar-stepper__circle"
									style={{
										backgroundColor: step.isCompleted
											? completedColor
											: step.isActive
												? primaryColor
												: 'white',
										borderColor:
											step.isCompleted || step.isActive
												? step.isCompleted
													? completedColor
													: primaryColor
												: backgroundColor,
										color: step.isCompleted || step.isActive ? 'white' : '#6B7280',
									}}
								>
									{step.isCompleted ? (
										<svg
											className="w-5 h-5"
											fill="currentColor"
											viewBox="0 0 20 20"
											role="img"
											aria-label="Completed"
										>
											<path
												fillRule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clipRule="evenodd"
											/>
										</svg>
									) : showStepNumbers ? (
										index + 1
									) : null}
								</div>

								{showStepTitles && step.title && (
									<div className="progress-bar-stepper__title">
										<span
											className={`${
												step.isActive
													? 'progress-bar-stepper__title--active'
													: 'progress-bar-stepper__title--inactive'
											}`}
										>
											{step.title}
										</span>
									</div>
								)}
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="progress-bar-stepper__content">{children}</div>

			<div className="progress-bar-stepper__navigation">
				<button
					type="button"
					onClick={() => navigation.goToPreviousStep()}
					disabled={navigation.isFirstStep}
					className={`progress-bar-stepper__nav-button progress-bar-stepper__nav-button--secondary ${
						navigation.isFirstStep ? 'progress-bar-stepper__nav-button--disabled' : ''
					}`}
				>
					Previous
				</button>

				<div className="progress-bar-stepper__step-counter">
					Step {currentStepIndex + 1} of {steps.length}
				</div>

				{navigation.isLastStep ? (
					<button
						type="submit"
						className="progress-bar-stepper__nav-button progress-bar-stepper__nav-button--primary"
						style={{ backgroundColor: primaryColor }}
					>
						{form.isSubmitting ? 'Submitting...' : 'Submit'}
					</button>
				) : (
					<button
						type="button"
						onClick={() => navigation.goToNextStep()}
						disabled={!navigation.canGoNext}
						className={`progress-bar-stepper__nav-button progress-bar-stepper__nav-button--primary ${
							!navigation.canGoNext ? 'progress-bar-stepper__nav-button--disabled' : ''
						}`}
						style={{ backgroundColor: primaryColor }}
					>
						Next
					</button>
				)}
			</div>
		</div>
	);
};
