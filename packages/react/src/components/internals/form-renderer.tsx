import type React from 'react';
import { FormProvider } from '../form-provider';
import type { FormProviderProps } from '../adapters/types';
import { FormElement } from './field-renderer';
import { useFormGridStyles } from '@/hooks';
import { useFormContext } from 'react-hook-form';
import { logger } from '@/lib/logger';
import { LayoutRenderer } from './layout-renderer';
import { StepperRenderer } from './stepper-renderer';
import { useState, useCallback } from 'react';

import type { FormConfig, FormStep } from '@json-form-engine/core/schemas';

/**
 * Helper to determine if form has multiple steps
 */
function isMultiStepForm(config: FormConfig): boolean {
	return config.steps.length > 1;
}

/**
 * Internal component that renders fields with access to form context and grid layout
 */
function FormElementsRenderer({ config }: { config: FormConfig }) {
	if (isMultiStepForm(config)) {
		return <MultiStepFormElementsRenderer config={config} />;
	}

	return <SingleStepFormElementsRenderer config={config} />;
}

/**
 * Component for single-step forms (only one step in the steps array)
 * Note: We don't pass stepMeta for single-step forms since step navigation is meaningless
 */
function SingleStepFormElementsRenderer({ config }: { config: FormConfig }) {
	const gridStyles = useFormGridStyles(config.grid);
	const singleStep = config.steps[0];

	if (!singleStep?.elements) return null;

	if (singleStep.layout && 'layoutId' in singleStep.layout) {
		return (
			<LayoutRenderer
				step={singleStep}
				stepMeta={undefined} // No step metadata for single-step forms
				formMeta={{
					id: config.id,
					title: config.title,
					description: config.description,
				}}
			>
				<div style={gridStyles}>
					{singleStep.elements.map((field) => (
						<FormElement key={field.id} config={field} className={field.className} style={field.style} />
					))}
				</div>
			</LayoutRenderer>
		);
	}

	return (
		<div style={gridStyles}>
			{singleStep.elements.map((field) => (
				<FormElement key={field.id} config={field} className={field.className} style={field.style} />
			))}
		</div>
	);
}

/**
 * Submit button component that has access to form context for proper validation
 */
function SubmitButton({
	submitButtonText = 'Submit',
	submitButtonClassName = 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
}: {
	submitButtonText?: string;
	submitButtonClassName?: string;
}) {
	const { formState } = useFormContext();

	return (
		<div className="pt-4">
			<button type="submit" className={submitButtonClassName} disabled={formState.isSubmitting}>
				{formState.isSubmitting ? 'Submitting...' : submitButtonText}
			</button>
		</div>
	);
}

/**
 * Internal component for multi-step form rendering
 */
function MultiStepFormElementsRenderer({ config }: { config: FormConfig }) {
	const { trigger, setFocus, formState } = useFormContext();
	const [currentStepIndex, setCurrentStepIndex] = useState(0);
	const [stepStates, setStepStates] = useState({
		completed: config.steps.map(() => false),
		valid: config.steps.map(() => false),
		visited: config.steps.map(() => false),
	});

	const validateStep = useCallback(
		async (stepIndex: number): Promise<boolean> => {
			const step = config.steps[stepIndex];
			if (!step?.elements) return true;

			const fieldNames = step.elements.map((field) => field.name);

			try {
				const isValid = await trigger(fieldNames);

				if (!isValid) {
					const fieldsWithErrors = fieldNames.filter((fieldName) => formState.errors[fieldName]);

					if (fieldsWithErrors.length > 0) {
						setFocus(fieldsWithErrors[0]);
						logger.debug(`Validation failed. Focused on field: ${fieldsWithErrors[0]}`);
					}
				}

				setStepStates((prev) => ({
					...prev,
					valid: prev.valid.map((v, i) => (i === stepIndex ? isValid : v)),
				}));

				return isValid;
			} catch (error) {
				logger.error('Validation error:', error as Error);
				return false;
			}
		},
		[config.steps, trigger, setFocus, formState.errors],
	);

	const goToStep = useCallback(
		(stepIndex: number) => {
			if (stepIndex >= 0 && stepIndex < config.steps.length) {
				setCurrentStepIndex(stepIndex);
				setStepStates((prev) => ({
					...prev,
					visited: prev.visited.map((v, i) => (i === stepIndex ? true : v)),
				}));
				logger.debug(`Navigated to step ${stepIndex}: ${config.steps[stepIndex]?.title}`);
			}
		},
		[config.steps],
	);

	const goToNextStep = useCallback(async () => {
		const isValid = await validateStep(currentStepIndex);
		if (isValid && currentStepIndex < config.steps.length - 1) {
			setStepStates((prev) => ({
				...prev,
				completed: prev.completed.map((c, i) => (i === currentStepIndex ? true : c)),
			}));
			goToStep(currentStepIndex + 1);
		}
	}, [currentStepIndex, config.steps.length, validateStep, goToStep]);

	const goToPreviousStep = useCallback(() => {
		if (currentStepIndex > 0) {
			goToStep(currentStepIndex - 1);
		}
	}, [currentStepIndex, goToStep]);

	const navigation = {
		canGoNext: currentStepIndex < config.steps.length - 1,
		canGoPrevious: currentStepIndex > 0,
		isFirstStep: currentStepIndex === 0,
		isLastStep: currentStepIndex === config.steps.length - 1,
		goToStep,
		goToNextStep,
		goToPreviousStep,
	};

	return (
		<StepperRenderer
			form={config}
			steps={config.steps}
			currentStepIndex={currentStepIndex}
			stepStates={stepStates}
			navigation={navigation}
			isSubmitting={formState.isSubmitting}
		>
			<StepContent step={config.steps[currentStepIndex]} config={config} />
		</StepperRenderer>
	);
}

/**
 * Component that renders the current step's content
 */
function StepContent({ step, config }: { step: FormStep; config: FormConfig }) {
	const gridStyles = useFormGridStyles(config.grid);

	if (!step?.elements) return null;

	if (step.layout && 'layoutId' in step.layout) {
		return (
			<LayoutRenderer
				step={step}
				stepMeta={{
					index: config.steps.indexOf(step),
					total: config.steps.length,
				}}
				formMeta={{
					id: config.id,
					title: config.title,
					description: config.description,
				}}
			>
				<div style={gridStyles}>
					{step.elements.map((field) => (
						<FormElement key={field.id} config={field} className={field.className} style={field.style} />
					))}
				</div>
			</LayoutRenderer>
		);
	}

	return (
		<div className="mt-8">
			<div style={gridStyles}>
				{step.elements.map((field) => (
					<FormElement key={field.id} config={field} className={field.className} style={field.style} />
				))}
			</div>
		</div>
	);
}

/**
 * Props for the FormRenderer component
 */
export interface FormRendererProps extends Omit<FormProviderProps, 'children'> {
	className?: string;
	style?: React.CSSProperties;
	showSubmitButton?: boolean;
	submitButtonText?: string;
	submitButtonClassName?: string;
}

/**
 * Main form renderer component that renders a complete form from configuration
 */
export function FormRenderer({
	config,
	defaultValues,
	onSubmit,
	onChange,
	onAction,
	onValidationError,
	className = '',
	style,
	showSubmitButton = true,
	submitButtonText = 'Submit',
	submitButtonClassName = 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
}: FormRendererProps) {
	const isMultiStep = isMultiStepForm(config);

	return (
		<FormProvider
			config={config}
			defaultValues={defaultValues}
			onSubmit={onSubmit}
			onChange={onChange}
			onAction={onAction}
			onValidationError={onValidationError}
		>
			<div className={`space-y-6 ${className}`} style={style}>
				<FormElementsRenderer config={config} />
				{!isMultiStep && showSubmitButton && (
					<SubmitButton submitButtonText={submitButtonText} submitButtonClassName={submitButtonClassName} />
				)}
			</div>
		</FormProvider>
	);
}
