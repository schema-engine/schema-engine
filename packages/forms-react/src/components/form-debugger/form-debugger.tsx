import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFormContext, useWatchForm } from '@/adapters/context';
import { cn } from '@/lib/utils';
import { useFormInstanceActions } from '@/hooks/use-form-context';
import { useOptionalStepperContext } from '@/contexts/stepper-context';
import './form-debugger.css';

export interface FormDebuggerProps {
	/** Open the panel on mount instead of showing the collapsed trigger. */
	defaultOpen?: boolean;
	/** Show each step's description in the step timeline. */
	showStepDetails?: boolean;
	/** Show the form state, values, and errors section. */
	showFormState?: boolean;
}

function FormDebuggerPanel({
	onClose,
	showStepDetails,
	showFormState,
}: { onClose: () => void } & Required<Omit<FormDebuggerProps, 'defaultOpen'>>) {
	const { formState } = useFormContext();
	const formValues = useWatchForm();
	const { currentStep, totalSteps, stepStates, navigation, submissionState } = useFormInstanceActions();
	const stepperContext = useOptionalStepperContext();

	const steps = stepperContext?.steps ?? [];
	const isMultiStep = totalSteps > 1;
	const progressPercentage = isMultiStep ? ((currentStep + 1) / totalSteps) * 100 : 100;

	return (
		<div className="form-debugger__panel">
			<div className="form-debugger__header">
				<div>
					<h3 className="form-debugger__header-title">{stepperContext?.form.title ?? 'Form Debugger'}</h3>
					{isMultiStep && (
						<span className="form-debugger__header-subtitle">
							Step {currentStep + 1} / {totalSteps}
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={onClose}
					className="form-debugger__close-button"
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
						aria-hidden="true"
					>
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
			</div>

			<div className="form-debugger__content">
				{isMultiStep && (
					<div>
						<div className="form-debugger__section-title">Progress</div>
						<div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full bg-primary transition-all"
								style={{ width: `${progressPercentage}%` }}
							/>
						</div>
					</div>
				)}

				{isMultiStep && steps.length > 0 && (
					<div>
						<div className="form-debugger__section-title">Steps</div>
						<div className="form-debugger__timeline mt-2">
							{steps.map((step, index) => (
								<div
									key={step.id}
									className={cn('form-debugger__timeline-item', {
										'form-debugger__timeline-item--active': index === currentStep,
									})}
								>
									<div>
										<div className="font-medium">{step.title ?? `Step ${index + 1}`}</div>
										{step.description && showStepDetails && (
											<div className="text-xs text-muted-foreground">{step.description}</div>
										)}
										<div className="form-debugger__timeline-meta">
											{step.isValid && (
												<span className="form-debugger__badge form-debugger__badge--valid">
													Valid
												</span>
											)}
											{!step.isValid && step.isVisited && (
												<span className="form-debugger__badge form-debugger__badge--invalid">
													Invalid
												</span>
											)}
											{step.isVisited && (
												<span className="form-debugger__badge form-debugger__badge--visited">
													Visited
												</span>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{showFormState && (
					<div>
						<div className="form-debugger__section-title">Form state</div>
						<div className="mt-2 space-y-1">
							<div className="form-debugger__detail-row">
								<span className="form-debugger__detail-label">Submitting</span>
								<code className="form-debugger__detail-value">{String(formState.isSubmitting)}</code>
							</div>
							<div className="form-debugger__detail-row">
								<span className="form-debugger__detail-label">Valid</span>
								<code className="form-debugger__detail-value">{String(formState.isValid)}</code>
							</div>
							<div className="form-debugger__detail-row">
								<span className="form-debugger__detail-label">Submission</span>
								<code className="form-debugger__detail-value">{submissionState.status}</code>
							</div>
							{stepStates && (
								<div className="form-debugger__detail-row">
									<span className="form-debugger__detail-label">Step states</span>
									<code className="form-debugger__detail-value">
										{JSON.stringify(stepStates.valid)}
									</code>
								</div>
							)}
						</div>
						<pre className="form-debugger__pre">{JSON.stringify(formValues, null, 2)}</pre>
						{Object.keys(formState.errors).length > 0 && (
							<pre className="form-debugger__pre">{JSON.stringify(formState.errors, null, 2)}</pre>
						)}
					</div>
				)}
			</div>

			{isMultiStep && navigation && (
				<div className="form-debugger__nav">
					<button
						type="button"
						onClick={navigation.goToPreviousStep}
						disabled={navigation.isFirstStep}
						className="form-debugger__nav-button"
					>
						Previous
					</button>

					<div className="form-debugger__nav-dots">
						{steps.map((step, index) => (
							<button
								key={step.id}
								type="button"
								onClick={() => navigation.goToStep(index)}
								disabled={!step.isVisited && index > currentStep}
								className={cn('form-debugger__nav-dot', {
									'form-debugger__nav-dot--active': index === currentStep,
									'form-debugger__nav-dot--completed': index < currentStep,
									'form-debugger__nav-dot--disabled': !step.isVisited && index > currentStep,
								})}
								aria-label={`Go to ${step.title ?? `step ${index + 1}`}`}
							/>
						))}
					</div>

					<button
						type="button"
						onClick={navigation.goToNextStep}
						disabled={!navigation.canGoNext}
						className="form-debugger__nav-button"
					>
						Next
					</button>
				</div>
			)}
		</div>
	);
}

/**
 * Opt-in dev tool. Mount it as a child of `FormRenderer` to inspect values,
 * errors, and multi-step state without replacing the production stepper:
 *
 * ```tsx
 * <FormRenderer config={config} engine={engine} adapter={adapter}>
 *   <FormDebugger />
 * </FormRenderer>
 * ```
 *
 * Nothing in the library mounts this for you, so it stays out of production
 * bundles unless you import it.
 */
export function FormDebugger({
	defaultOpen = false,
	showStepDetails = true,
	showFormState = true,
}: FormDebuggerProps = {}) {
	const [isExpanded, setIsExpanded] = useState(defaultOpen);
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isExpanded) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
				setIsExpanded(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isExpanded]);

	if (typeof document === 'undefined') return null;

	return createPortal(
		<div className="form-debugger">
			<div
				ref={panelRef}
				className={cn('form-debugger__widget', {
					'form-debugger__widget--expanded': isExpanded,
				})}
			>
				{!isExpanded ? (
					<button
						type="button"
						onClick={() => setIsExpanded(true)}
						className="form-debugger__fab"
						aria-label="Open form debugger"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							aria-hidden="true"
						>
							<path d="m8 6 4-4 4 4" />
							<path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22" />
							<path d="m20 22-5-5" />
						</svg>
					</button>
				) : (
					<FormDebuggerPanel
						onClose={() => setIsExpanded(false)}
						showStepDetails={showStepDetails}
						showFormState={showFormState}
					/>
				)}
			</div>
		</div>,
		document.body,
	);
}
