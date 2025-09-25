import type React from 'react';
import type { SharedStepperComponentProps } from './shared-types';

interface ProgressBarStepperConfig {
	showStepNumbers?: boolean;
	showStepTitles?: boolean;
	primaryColor?: string;
	completedColor?: string;
	backgroundColor?: string;
}

interface VerticalStepsStepperConfig {
	showConnectors?: boolean;
	primaryColor?: string;
	completedColor?: string;
	backgroundColor?: string;
}

interface MinimalistStepperConfig {
	showProgress?: boolean;
	primaryColor?: string;
}

/**
 * Progress Bar Stepper
 * Shows a horizontal progress bar with step indicators
 */
export const ProgressBarStepper: React.FC<SharedStepperComponentProps> = ({
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
		<div className="w-full max-w-4xl mx-auto">
			{/* Progress bar header */}
			<div className="mb-8 px-4">
				<div className="relative">
					{/* Progress line background */}
					<div
						className="absolute top-6 left-0 h-1 rounded-full transition-all duration-300"
						style={{
							backgroundColor,
							width: '100%',
						}}
					/>

					{/* Progress line fill */}
					<div
						className="absolute top-6 left-0 h-1 rounded-full transition-all duration-300"
						style={{
							backgroundColor: primaryColor,
							width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
						}}
					/>

					{/* Step indicators */}
					<div className="flex justify-between relative">
						{steps.map((step, index: number) => (
							<button
								key={step.id}
								type="button"
								onClick={() => navigation.goToStep(index)}
								className="flex flex-col items-center group transition-all duration-200"
								disabled={!step.isVisited && index > currentStepIndex}
							>
								{/* Step circle */}
								<div
									className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-200 z-10"
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
										<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
											<title>Completed</title>
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

								{/* Step title */}
								{showStepTitles && step.title && (
									<div className="mt-2 text-sm text-center max-w-24">
										<span
											className={`${
												step.isActive ? 'font-semibold text-gray-900' : 'text-gray-600'
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

			{/* Current step content */}
			<div className="px-4">{children}</div>

			{/* Navigation buttons */}
			<div className="flex justify-between items-center mt-8 px-4 pt-8 border-t border-gray-200">
				<button
					type="button"
					onClick={() => navigation.goToPreviousStep()}
					disabled={navigation.isFirstStep}
					className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
				>
					Previous
				</button>

				<div className="text-sm text-gray-500">
					Step {currentStepIndex + 1} of {steps.length}
				</div>

				{navigation.isLastStep ? (
					<button
						type="submit"
						className="px-6 py-2 text-white rounded-md transition-all duration-200 hover:opacity-90"
						style={{ backgroundColor: primaryColor }}
					>
						{form.isSubmitting ? 'Submitting...' : 'Submit'}
					</button>
				) : (
					<button
						type="button"
						onClick={() => navigation.goToNextStep()}
						disabled={!navigation.canGoNext}
						className="px-6 py-2 text-white rounded-md transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
						style={{ backgroundColor: primaryColor }}
					>
						Next
					</button>
				)}
			</div>
		</div>
	);
};

/**
 * Vertical Steps Stepper
 * Shows steps as a vertical timeline with content on the right
 */
export const VerticalStepsStepper: React.FC<SharedStepperComponentProps> = ({
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
		<div className="flex gap-8 max-w-6xl mx-auto">
			{/* Left sidebar with steps */}
			<div className="w-80 flex-shrink-0">
				<div className="relative">
					{/* Vertical connector line */}
					{showConnectors && (
						<div className="absolute left-6 top-0 w-px h-full" style={{ backgroundColor }} />
					)}

					{/* Steps list */}
					<div className="space-y-6">
						{steps.map((step, index: number) => (
							<button
								key={step.id}
								type="button"
								onClick={() => navigation.goToStep(index)}
								disabled={!step.isVisited && index > currentStepIndex}
								className="flex items-start w-full text-left group transition-all duration-200"
							>
								{/* Step indicator */}
								<div
									className="w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200 flex-shrink-0 z-10"
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
										<svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
											<title>Completed</title>
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

								{/* Step content */}
								<div className="ml-4 min-w-0 flex-1">
									<div
										className={`text-sm font-medium mb-1 ${
											step.isActive ? 'text-gray-900' : 'text-gray-600'
										}`}
									>
										{step.title || `Step ${index + 1}`}
									</div>
									{step.description && (
										<div className="text-sm text-gray-500 leading-tight">{step.description}</div>
									)}
									{step.isActive && (
										<div className="text-xs font-medium mt-1" style={{ color: primaryColor }}>
											Current step
										</div>
									)}
								</div>
							</button>
						))}
					</div>
				</div>

				{/* Navigation buttons */}
				<div className="mt-8 space-y-3">
					<button
						type="button"
						onClick={() => navigation.goToPreviousStep()}
						disabled={navigation.isFirstStep}
						className="w-full py-2 px-4 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
					>
						Previous Step
					</button>

					{navigation.isLastStep ? (
						<button
							type="submit"
							className="w-full py-2 px-4 text-sm text-white rounded-md transition-all duration-200 hover:opacity-90"
							style={{ backgroundColor: primaryColor }}
						>
							{form.isSubmitting ? 'Submitting...' : 'Complete Form'}
						</button>
					) : (
						<button
							type="button"
							onClick={() => navigation.goToNextStep()}
							disabled={!navigation.canGoNext}
							className="w-full py-2 px-4 text-sm text-white rounded-md transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
							style={{ backgroundColor: primaryColor }}
						>
							Next Step
						</button>
					)}
				</div>
			</div>

			{/* Right content area */}
			<div className="flex-1 min-w-0">
				<div className="bg-white rounded-lg border border-gray-200 p-6">{children}</div>
			</div>
		</div>
	);
};

/**
 * Minimalist Stepper
 * Clean design with optional progress indicator
 */
export const MinimalistStepper: React.FC<SharedStepperComponentProps> = ({
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
		<div className="w-full max-w-2xl mx-auto">
			{/* Header with optional progress */}
			<div className="mb-8">
				{showProgress && (
					<div className="mb-4">
						<div className="flex justify-between text-sm text-gray-600 mb-2">
							<span>Progress</span>
							<span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}% complete</span>
						</div>
						<div className="w-full bg-gray-200 rounded-full h-2">
							<div
								className="h-2 rounded-full transition-all duration-300"
								style={{
									backgroundColor: primaryColor,
									width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
								}}
							/>
						</div>
					</div>
				)}

				{/* Current step info */}
				<div>
					<div className="text-sm text-gray-500 mb-1">
						Step {currentStepIndex + 1} of {steps.length}
					</div>
					<h2 className="text-xl font-semibold text-gray-900">
						{steps[currentStepIndex]?.title || `Step ${currentStepIndex + 1}`}
					</h2>
					{steps[currentStepIndex]?.description && (
						<p className="text-gray-600 mt-1">{steps[currentStepIndex].description}</p>
					)}
				</div>
			</div>

			{/* Content */}
			<div className="mb-8">{children}</div>

			{/* Navigation */}
			<div className="flex justify-between items-center pt-6 border-t border-gray-200">
				<button
					type="button"
					onClick={() => navigation.goToPreviousStep()}
					disabled={navigation.isFirstStep}
					className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
				>
					← Previous
				</button>

				{navigation.isLastStep ? (
					<button
						type="submit"
						className="px-6 py-2 text-sm text-white rounded-md transition-all duration-200 hover:opacity-90"
						style={{ backgroundColor: primaryColor }}
					>
						{form.isSubmitting ? 'Submitting...' : 'Submit'}
					</button>
				) : (
					<button
						type="button"
						onClick={() => navigation.goToNextStep()}
						disabled={!navigation.canGoNext}
						className="px-6 py-2 text-sm text-white rounded-md transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
						style={{ backgroundColor: primaryColor }}
					>
						Next →
					</button>
				)}
			</div>
		</div>
	);
};
