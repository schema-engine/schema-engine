import { cn } from '@/lib/utils';
import type { BaseStepperConfig } from './types';
import { StepperProvider, useStepperContext } from './context';
import { useStepperContext as useGlobalStepperContext } from '@/contexts/stepper-context';
import type React from 'react';
import { useState, useRef, useEffect } from 'react';

export interface DebuggerStepperConfig extends BaseStepperConfig {
	__id: 'debugger';
	showStepDetails?: boolean;
	defaultExpanded?: boolean;
	showFormState?: boolean;
}

/**
 * Debugger Stepper Root Component
 * FAB-style widget that expands into a modern dev tool
 */
const DebuggerStepperRoot: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
	const globalContext = useGlobalStepperContext();
	const { config } = globalContext;
	const { defaultExpanded = false } = (config as DebuggerStepperConfig) || {};
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isExpanded) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
				setIsExpanded(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isExpanded]);

	return (
		<StepperProvider value={globalContext}>
			<div className={cn('debugger-stepper', className)}>
				{children}
				<div
					className={cn('debugger-stepper__widget', {
						'debugger-stepper__widget--expanded': isExpanded,
					})}
				>
					{!isExpanded ? (
						<button
							type="button"
							onClick={() => setIsExpanded(true)}
							className="debugger-stepper__fab"
							aria-label="Open debugger"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								role="img"
								aria-label="Debug icon"
							>
								<path d="m8 6 4-4 4 4" />
								<path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22" />
								<path d="m20 22-5-5" />
							</svg>
						</button>
					) : (
						<div ref={panelRef} className="debugger-stepper__panel">
							<DebuggerStepperHeader onClose={() => setIsExpanded(false)} />
							<DebuggerStepperContent />
							<DebuggerStepperNavigation />
						</div>
					)}
				</div>
			</div>
		</StepperProvider>
	);
};

/**
 * Debugger Stepper Header Component
 * Shows form title and close button
 */
function DebuggerStepperHeader({ onClose }: { onClose: () => void }) {
	const { form, currentStepIndex, steps } = useStepperContext<DebuggerStepperConfig>();

	return (
		<div className="debugger-stepper__header">
			<div className="debugger-stepper__header-content">
				<div className="debugger-stepper__header-icon">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
						role="presentation"
					>
						<path d="m8 6 4-4 4 4" />
						<path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22" />
						<path d="m20 22-5-5" />
					</svg>
				</div>
				<div className="debugger-stepper__header-info">
					<h3 className="debugger-stepper__header-title">{form.title || 'Form Debugger'}</h3>
					<span className="debugger-stepper__header-subtitle">
						Step {currentStepIndex + 1} / {steps.length}
					</span>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="debugger-stepper__close-button"
				aria-label="Close debugger"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
					role="presentation"
				>
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
			</button>
		</div>
	);
}

/**
 * Debugger Stepper Content Component
 * Shows step progress, details, and form state
 */
function DebuggerStepperContent() {
	const { steps, currentStepIndex, config, form } = useStepperContext<DebuggerStepperConfig>();
	const { showStepDetails = true, showFormState = true } = config || {};
	const currentStep = steps[currentStepIndex];
	const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

	return (
		<div className="debugger-stepper__content">
			{/* Progress Bar */}
			<div className="debugger-stepper__progress-section">
				<div className="debugger-stepper__progress-label">
					<span>Progress</span>
					<span className="debugger-stepper__progress-value">{Math.round(progressPercentage)}%</span>
				</div>
				<div className="debugger-stepper__progress-track">
					<div className="debugger-stepper__progress-fill" style={{ width: `${progressPercentage}%` }} />
				</div>
			</div>

			{/* Steps Timeline */}
			<div className="debugger-stepper__timeline">
				{steps.map((step, index) => {
					const isActive = index === currentStepIndex;
					const isPast = index < currentStepIndex;

					return (
						<div
							key={step.id}
							className={cn('debugger-stepper__timeline-item', {
								'debugger-stepper__timeline-item--active': isActive,
								'debugger-stepper__timeline-item--completed': isPast,
								'debugger-stepper__timeline-item--pending': !isPast && !isActive,
							})}
						>
							<div className="debugger-stepper__timeline-marker">
								{isPast ? (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="3"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
										role="presentation"
									>
										<polyline points="20 6 9 17 4 12" />
									</svg>
								) : (
									<span>{index + 1}</span>
								)}
							</div>
							<div className="debugger-stepper__timeline-content">
								<div className="debugger-stepper__timeline-title">
									{step.title || `Step ${index + 1}`}
								</div>
								{step.description && showStepDetails && (
									<div className="debugger-stepper__timeline-description">{step.description}</div>
								)}
								<div className="debugger-stepper__timeline-meta">
									{step.isValid && <span className="debugger-stepper__badge--valid">Valid</span>}
									{!step.isValid && step.isVisited && (
										<span className="debugger-stepper__badge--invalid">Invalid</span>
									)}
									{step.isVisited && (
										<span className="debugger-stepper__badge--visited">Visited</span>
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Current Step Details */}
			{showStepDetails && (
				<div className="debugger-stepper__details">
					<div className="debugger-stepper__details-header">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
							role="presentation"
						>
							<circle cx="12" cy="12" r="10" />
							<path d="M12 16v-4" />
							<path d="M12 8h.01" />
						</svg>
						<span>Current Step Details</span>
					</div>
					<div className="debugger-stepper__details-content">
						<div className="debugger-stepper__detail-row">
							<span className="debugger-stepper__detail-label">ID:</span>
							<code className="debugger-stepper__detail-value">{currentStep.id}</code>
						</div>
						<div className="debugger-stepper__detail-row">
							<span className="debugger-stepper__detail-label">Index:</span>
							<code className="debugger-stepper__detail-value">{currentStepIndex}</code>
						</div>
						<div className="debugger-stepper__detail-row">
							<span className="debugger-stepper__detail-label">Valid:</span>
							<code className="debugger-stepper__detail-value">{currentStep.isValid.toString()}</code>
						</div>
						<div className="debugger-stepper__detail-row">
							<span className="debugger-stepper__detail-label">Visited:</span>
							<code className="debugger-stepper__detail-value">{currentStep.isVisited.toString()}</code>
						</div>
					</div>
				</div>
			)}

			{/* Form State */}
			{showFormState && (
				<div className="debugger-stepper__details">
					<div className="debugger-stepper__details-header">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
							role="presentation"
						>
							<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
							<polyline points="14 2 14 8 20 8" />
						</svg>
						<span>Form State</span>
					</div>
					<div className="debugger-stepper__details-content">
						<div className="debugger-stepper__detail-row">
							<span className="debugger-stepper__detail-label">Form ID:</span>
							<code className="debugger-stepper__detail-value">{form.id}</code>
						</div>
						<div className="debugger-stepper__detail-row">
							<span className="debugger-stepper__detail-label">Submitting:</span>
							<code className="debugger-stepper__detail-value">
								{form.isSubmitting?.toString() || 'false'}
							</code>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * Debugger Stepper Navigation Component
 * Compact navigation controls
 */
function DebuggerStepperNavigation() {
	const { navigation, form, steps, currentStepIndex } = useStepperContext<DebuggerStepperConfig>();

	return (
		<div className="debugger-stepper__navigation">
			<div className="debugger-stepper__nav-group">
				<button
					type="button"
					onClick={() => navigation.goToPreviousStep()}
					disabled={navigation.isFirstStep}
					className="debugger-stepper__nav-button debugger-stepper__nav-button--secondary"
					title="Previous Step"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
						role="presentation"
					>
						<path d="m15 18-6-6 6-6" />
					</svg>
					<span>Previous</span>
				</button>

				<div className="debugger-stepper__nav-steps">
					{steps.map((step, index) => (
						<button
							key={step.id}
							type="button"
							onClick={() => navigation.goToStep(index)}
							disabled={!step.isVisited && index > currentStepIndex}
							className={cn('debugger-stepper__nav-dot', {
								'debugger-stepper__nav-dot--active': index === currentStepIndex,
								'debugger-stepper__nav-dot--completed': index < currentStepIndex,
								'debugger-stepper__nav-dot--disabled': !step.isVisited && index > currentStepIndex,
							})}
							title={step.title || `Step ${index + 1}`}
							aria-label={`Go to ${step.title || `Step ${index + 1}`}`}
						/>
					))}
				</div>

				<button
					type="submit"
					style={{ display: navigation.isLastStep ? 'flex' : 'none' }}
					className="debugger-stepper__nav-button debugger-stepper__nav-button--primary"
					title="Submit Form"
				>
					<span>{form.isSubmitting ? 'Submitting...' : 'Submit'}</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
						role="presentation"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</button>

				<button
					type="button"
					onClick={() => navigation.goToNextStep()}
					disabled={!navigation.canGoNext}
					style={{ display: navigation.isLastStep ? 'none' : 'flex' }}
					className="debugger-stepper__nav-button debugger-stepper__nav-button--primary"
					title="Next Step"
				>
					<span>Next</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
						role="presentation"
					>
						<path d="m9 18 6-6-6-6" />
					</svg>
				</button>
			</div>
		</div>
	);
}

/**
 * Debugger Stepper with Compound Pattern
 * Modern dev tool widget with FAB button
 */
export const DebuggerStepper = Object.assign(DebuggerStepperRoot, {
	Header: DebuggerStepperHeader,
	Content: DebuggerStepperContent,
	Navigation: DebuggerStepperNavigation,
});

/**
 * Default Debugger Stepper Layout
 * Pre-composed layout that renders the form content normally
 * with the debugger widget as a floating overlay
 */
export const DebuggerStepperComposed: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	return (
		<DebuggerStepper>
			<div className="debugger-stepper__main-content">{children}</div>
		</DebuggerStepper>
	);
};

import type { StepperRegistration } from '@json-form-engine/core/types';
import { DebuggerStepperConfigSchema } from './debugger-stepper.types';

export const DebuggerStepperRegistration: StepperRegistration<DebuggerStepperConfig, { children?: React.ReactNode }> = {
	__id: 'debugger',
	render: DebuggerStepperComposed,
	schema: DebuggerStepperConfigSchema,
	metadata: {
		name: 'Debugger Stepper',
		description: 'Modern dev tool widget with FAB button for debugging multi-step forms',
		icon: 'bug',
	},
};
