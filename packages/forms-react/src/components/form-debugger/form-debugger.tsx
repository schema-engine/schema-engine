import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFormContext, useWatchForm } from '@/adapters';
import { useFormInstanceActions } from '@/hooks/use-form-context';
import { useOptionalViewContext } from '@/contexts/view-context';
import './form-debugger.css';

export interface FormDebuggerProps {
	/** Open the panel on mount instead of showing the collapsed trigger. */
	defaultOpen?: boolean;
	/** Show each step's description in the step timeline. */
	showStepDetails?: boolean;
	/** Show the form state, values, and errors section. */
	showFormState?: boolean;
}

function CloseIcon() {
	return (
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
	);
}

function DebuggerHeader({
	title,
	currentStep,
	totalSteps,
	onClose,
}: {
	title: string;
	currentStep: number;
	totalSteps: number;
	onClose: () => void;
}) {
	return (
		<div className="form-debugger__header">
			<div>
				<h3 className="form-debugger__header-title">{title}</h3>
				{totalSteps > 1 && (
					<span className="form-debugger__header-subtitle">
						Step {currentStep + 1} / {totalSteps}
					</span>
				)}
			</div>
			<button type="button" onClick={onClose} className="form-debugger__close-button" aria-label="Close debugger">
				<CloseIcon />
			</button>
		</div>
	);
}

function DebuggerProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
	return (
		<div>
			<div className="form-debugger__section-title">Progress</div>
			<div className="form-debugger__progress">
				<div
					className="form-debugger__progress-fill"
					style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
				/>
			</div>
		</div>
	);
}

function DebuggerSteps({
	steps,
	currentStep,
	showDetails,
}: {
	steps: Array<{
		id: string;
		title?: string;
		description?: string;
		isValid?: boolean;
		isVisited?: boolean;
	}>;
	currentStep: number;
	showDetails: boolean;
}) {
	return (
		<div>
			<div className="form-debugger__section-title">Steps</div>
			<div className="form-debugger__timeline">
				{steps.map((step, index) => (
					<div
						key={step.id}
						className={`form-debugger__timeline-item ${index === currentStep ? 'form-debugger__timeline-item--active' : ''}`}
					>
						<div>
							<div className="form-debugger__step-title">{step.title ?? `Step ${index + 1}`}</div>
							{step.description && showDetails && (
								<div className="form-debugger__step-description">{step.description}</div>
							)}
							<div className="form-debugger__timeline-meta">
								{step.isValid && (
									<span className="form-debugger__badge form-debugger__badge--valid">Valid</span>
								)}
								{!step.isValid && step.isVisited && (
									<span className="form-debugger__badge form-debugger__badge--invalid">Invalid</span>
								)}
								{step.isVisited && (
									<span className="form-debugger__badge form-debugger__badge--visited">Visited</span>
								)}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function DebuggerFormState({
	formState,
	formValues,
	submissionStatus,
	stepStates,
}: {
	formState: { isSubmitting: boolean; isValid: boolean; errors: Record<string, unknown> };
	formValues: unknown;
	submissionStatus: string;
	stepStates?: { valid: boolean[] } | null;
}) {
	return (
		<div>
			<div className="form-debugger__section-title">Form state</div>
			<div className="form-debugger__details">
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
					<code className="form-debugger__detail-value">{submissionStatus}</code>
				</div>
				{stepStates ? (
					<div className="form-debugger__detail-row">
						<span className="form-debugger__detail-label">Step states</span>
						<code className="form-debugger__detail-value">{JSON.stringify(stepStates.valid)}</code>
					</div>
				) : null}
			</div>
			<pre className="form-debugger__pre">{JSON.stringify(formValues, null, 2)}</pre>
			{Object.keys(formState.errors).length > 0 && (
				<pre className="form-debugger__pre">{JSON.stringify(formState.errors, null, 2)}</pre>
			)}
		</div>
	);
}

function DebuggerNav({
	steps,
	currentStep,
	navigation,
}: {
	steps: Array<{ id: string; title?: string; isVisited?: boolean }>;
	currentStep: number;
	navigation: {
		goToPreviousStep: () => void;
		goToNextStep: () => void;
		goToStep: (index: number) => void;
		isFirstStep: boolean;
		canGoNext: boolean;
	};
}) {
	return (
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
						className={[
							'form-debugger__nav-dot',
							index === currentStep && 'form-debugger__nav-dot--active',
							index < currentStep && 'form-debugger__nav-dot--completed',
							!step.isVisited && index > currentStep && 'form-debugger__nav-dot--disabled',
						]
							.filter(Boolean)
							.join(' ')}
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
	);
}

function FormDebuggerPanel({
	onClose,
	showStepDetails,
	showFormState,
}: { onClose: () => void } & Required<Omit<FormDebuggerProps, 'defaultOpen'>>) {
	const { formState } = useFormContext();
	const formValues = useWatchForm();
	const { currentStep, totalSteps, stepStates, navigation, submissionState } = useFormInstanceActions();
	const view = useOptionalViewContext();

	const steps = view?.steps ?? [];
	const isMultiStep = totalSteps > 1;

	return (
		<div className="form-debugger__panel">
			<DebuggerHeader
				title={view?.form.title ?? 'Form Debugger'}
				currentStep={currentStep}
				totalSteps={totalSteps}
				onClose={onClose}
			/>
			<div className="form-debugger__content">
				{isMultiStep && <DebuggerProgress currentStep={currentStep} totalSteps={totalSteps} />}
				{isMultiStep && steps.length > 0 && (
					<DebuggerSteps steps={steps} currentStep={currentStep} showDetails={showStepDetails} />
				)}
				{showFormState && (
					<DebuggerFormState
						formState={formState}
						formValues={formValues}
						submissionStatus={submissionState.status}
						stepStates={stepStates}
					/>
				)}
			</div>
			{isMultiStep && navigation ? (
				<DebuggerNav steps={steps} currentStep={currentStep} navigation={navigation} />
			) : null}
		</div>
	);
}

/**
 * Opt-in dev tool. Mount it as a child of `FormRenderer` to inspect values,
 * errors, and multi-step state:
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
				className={`form-debugger__widget ${isExpanded ? 'form-debugger__widget--expanded' : ''}`}
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
