import { cn } from '@/shadcn/lib/utils';
import { Button } from '@/shadcn/ui/button';
import type { StepperComponent } from './types';
import type { BaseStepperConfig } from '@json-form-engine/core';

export interface DefaultStepperConfig extends BaseStepperConfig {
	__stepperId: 'default';
	orientation?: 'horizontal' | 'vertical';
	variant?: 'default' | 'dots' | 'pills';
	showStepNumbers?: boolean;
	showStepTitles?: boolean;
	allowStepJumping?: boolean;
	primaryColor?: string;
	completedColor?: string;
}

/**
 * Default Stepper
 * Versatile stepper with horizontal/vertical layouts and multiple styles
 */
export const DefaultStepper: StepperComponent<DefaultStepperConfig> = ({
	steps,
	currentStepIndex,
	navigation,
	config,
	form,
	children,
}) => {
	const {
		orientation = 'horizontal',
		variant = 'default',
		showStepNumbers = true,
		showStepTitles = true,
		allowStepJumping = false,
	} = config || {};

	const isHorizontal = orientation === 'horizontal';
	const isVertical = orientation === 'vertical';

	return (
		<div className="stepper">
			<div
				className={cn(
					'stepper__header',
					isHorizontal && 'stepper__header--horizontal',
					isVertical && 'stepper__header--vertical',
				)}
			>
				{steps.map((step, index) => {
					const canClick = allowStepJumping && (step.isVisited || index <= currentStepIndex);

					return (
						<div
							key={step.id}
							className={cn(
								'stepper__step',
								isHorizontal && 'stepper__step--horizontal',
								isVertical && 'stepper__step--vertical',
								isVertical && step.isActive && 'stepper__step--active',
								isVertical && step.isCompleted && !step.isActive && 'stepper__step--completed',
								canClick && 'stepper__step--clickable',
							)}
							onClick={canClick ? () => navigation.goToStep(index) : undefined}
							onKeyDown={
								canClick
									? (e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												navigation.goToStep(index);
											}
										}
									: undefined
							}
							role={canClick ? 'button' : undefined}
							tabIndex={canClick ? 0 : undefined}
						>
							<div
								className={cn(
									'stepper__indicator',
									variant === 'dots' && 'stepper__indicator--dots',
									step.isCompleted && 'stepper__indicator--completed',
									step.isActive && !step.isCompleted && 'stepper__indicator--active',
									!step.isActive && !step.isCompleted && 'stepper__indicator--inactive',
								)}
							>
								{variant !== 'dots' && step.isCompleted ? (
									<svg
										className="w-4 h-4"
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
								) : showStepNumbers && variant !== 'dots' ? (
									<span className="text-sm font-medium">{index + 1}</span>
								) : null}
							</div>

							{showStepTitles && variant !== 'dots' && step.title && (
								<div
									className={cn(
										isHorizontal && 'stepper__title--horizontal',
										isVertical && 'stepper__title--vertical',
									)}
								>
									<span
										className={cn(
											'stepper__title',
											step.isActive ? 'stepper__title--active' : 'stepper__title--inactive',
										)}
									>
										{step.title}
									</span>
									{step.description && isVertical && (
										<p className="stepper__description">{step.description}</p>
									)}
								</div>
							)}

							{/* Connecting lines */}
							{index < steps.length - 1 && (
								<>
									{isVertical && (
										<div
											className={cn(
												'stepper__connector stepper__connector--vertical',
												step.isCompleted && 'stepper__connector--completed',
											)}
										/>
									)}
									{isHorizontal && (
										<div
											className={cn(
												'stepper__connector stepper__connector--horizontal',
												step.isCompleted && 'stepper__connector--completed',
											)}
										/>
									)}
								</>
							)}
						</div>
					);
				})}
			</div>

			<div className="stepper__content">{children}</div>

			<div className="stepper__navigation">
				<div>
					{!navigation.isFirstStep && (
						<Button
							type="button"
							variant="outline"
							onClick={navigation.goToPreviousStep}
							disabled={!navigation.canGoPrevious}
						>
							Previous
						</Button>
					)}
				</div>

				<div className="stepper__navigation-buttons">
					<div className="text-sm text-gray-500">
						Step {currentStepIndex + 1} of {steps.length}
					</div>
				</div>

				<div>
					{navigation.isLastStep ? (
						<Button type="submit" disabled={form.isSubmitting}>
							{form.isSubmitting ? 'Submitting...' : 'Submit'}
						</Button>
					) : (
						<Button type="button" onClick={navigation.goToNextStep} disabled={!navigation.canGoNext}>
							Next
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};
