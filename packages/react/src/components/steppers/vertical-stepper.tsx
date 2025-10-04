import type React from 'react';
import type { BaseStepperProps } from './types';

export interface VerticalStepsStepperConfig {
	showConnectors?: boolean;
	primaryColor?: string;
	completedColor?: string;
	backgroundColor?: string;
}

/**
 * Vertical Steps Stepper
 * Shows steps as a vertical timeline with content on the right
 */
export const VerticalStepsStepper: React.FC<BaseStepperProps> = ({
	steps,
	navigation,
	config,
	children,
	currentStepIndex,
	form,
}) => {
	const verticalConfig = config as VerticalStepsStepperConfig | undefined;
	const {
		showConnectors = true,
		primaryColor = '#3b82f6',
		completedColor = '#10b981',
		backgroundColor = '#e5e7eb',
	} = verticalConfig || {};

	return (
		<div className="vertical-stepper">
			<div className="vertical-stepper__sidebar">
				<div className="vertical-stepper__steps">
					{showConnectors && <div className="vertical-stepper__connector-line" style={{ backgroundColor }} />}

					<div className="vertical-stepper__steps-list">
						{steps.map((step, index: number) => (
							<button
								key={step.id}
								type="button"
								onClick={() => navigation.goToStep(index)}
								disabled={!step.isVisited && index > currentStepIndex}
								className={`vertical-stepper__step ${
									!step.isVisited && index > currentStepIndex
										? 'vertical-stepper__step--disabled'
										: 'vertical-stepper__step--clickable'
								}`}
							>
								<div
									className="vertical-stepper__indicator"
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
									}}
								>
									{step.isCompleted ? (
										<svg
											className="w-5 h-5 text-white"
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
									) : (
										<span
											className="text-sm font-semibold"
											style={{
												color: step.isActive ? 'white' : '#6b7280',
											}}
										>
											{index + 1}
										</span>
									)}
								</div>

								<div className="vertical-stepper__step-content">
									<div
										className={`vertical-stepper__step-title ${
											step.isActive
												? 'vertical-stepper__step-title--active'
												: 'vertical-stepper__step-title--inactive'
										}`}
									>
										{step.title || `Step ${index + 1}`}
									</div>
									{step.description && (
										<div className="vertical-stepper__step-description">{step.description}</div>
									)}
									{step.isActive && (
										<div
											className="vertical-stepper__current-label"
											style={{ color: primaryColor }}
										>
											Current step
										</div>
									)}
								</div>
							</button>
						))}
					</div>
				</div>

				<div className="vertical-stepper__navigation">
					<button
						type="button"
						onClick={() => navigation.goToPreviousStep()}
						disabled={navigation.isFirstStep}
						className={`vertical-stepper__nav-button vertical-stepper__nav-button--secondary ${
							navigation.isFirstStep ? 'vertical-stepper__nav-button--disabled' : ''
						}`}
					>
						Previous Step
					</button>

					{navigation.isLastStep ? (
						<button
							type="submit"
							className="vertical-stepper__nav-button vertical-stepper__nav-button--primary"
							style={{ backgroundColor: primaryColor }}
						>
							{form.isSubmitting ? 'Submitting...' : 'Complete Form'}
						</button>
					) : (
						<button
							type="button"
							onClick={() => navigation.goToNextStep()}
							disabled={!navigation.canGoNext}
							className={`vertical-stepper__nav-button vertical-stepper__nav-button--primary ${
								!navigation.canGoNext ? 'vertical-stepper__nav-button--disabled' : ''
							}`}
							style={{ backgroundColor: primaryColor }}
						>
							Next Step
						</button>
					)}
				</div>
			</div>

			<div className="vertical-stepper__main-content">
				<div className="vertical-stepper__content-card">{children}</div>
			</div>
		</div>
	);
};
