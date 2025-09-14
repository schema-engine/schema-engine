import type React from 'react';
import {
	FormEngineFormProvider,
	type FormProviderProps,
	type FormEngineProviderProps,
	FormEngineProvider,
} from '../provider';
import { FormElement } from './field-renderer';
import { useFormGridStyles } from '@/hooks';
import { Stepper, useStepper } from '../stepper';
import { useFormContext } from 'react-hook-form';
import { logger } from '@/lib/logger';
import type { FieldConfig, FormConfig, FormStep } from '@json-form-engine/core/schemas';

/**
 * Helper to get fields for a specific step - now fields are directly in steps
 */
function getFieldsForStep(step: FormStep): FieldConfig[] {
	return step.elements || [];
}

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
 */
function SingleStepFormElementsRenderer({ config }: { config: FormConfig }) {
	const gridStyles = useFormGridStyles(config.grid);
	const singleStep = config.steps[0];

	if (!singleStep?.elements) return null;

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
	const { trigger, getValues, setFocus, formState } = useFormContext();

	const handleStepChange = (stepIndex: number, step: FormStep) => {
		logger.debug(`Navigated to step ${stepIndex}: ${step.title}`);
	};

	const validateStep = async (stepIndex: number): Promise<boolean> => {
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

			return isValid;
		} catch (error) {
			logger.error('Validation error:', error as Error);
			return false;
		}
	};

	return (
		<Stepper
			steps={config.steps}
			navigation={config.stepper}
			validationMode={config.mode}
			onStepChange={handleStepChange}
			getFormData={getValues}
			validateStep={validateStep}
		>
			<StepperLayout config={config} />
		</Stepper>
	);
}

/**
 * Layout component that handles different stepper orientations
 */
function StepperLayout({ config }: { config: FormConfig }) {
	const orientation = config.stepper?.orientation || 'horizontal';

	if (orientation === 'vertical') {
		return (
			<div className="flex gap-12">
				<div className="w-72 flex-shrink-0">
					<div className="sticky top-8">
						<Stepper.Header navigation={config.stepper} />
					</div>
				</div>

				<div className="flex-1 min-w-0">
					<Stepper.Content>
						<StepperFormContent config={config} />
					</Stepper.Content>

					<div className="mt-8">
						<Stepper.Navigation navigation={config.stepper} />
					</div>
				</div>
			</div>
		);
	}

	return (
		<>
			<Stepper.Header navigation={config.stepper} className="mb-8" />

			<Stepper.Content>
				<StepperFormContent config={config} />
			</Stepper.Content>

			<Stepper.Navigation navigation={config.stepper} />
		</>
	);
}

/**
 * Component that renders the current step's fields
 */
function StepperFormContent({ config }: { config: FormConfig }) {
	const { currentStep, steps } = useStepper();
	const currentStep_data = steps[currentStep];

	const gridStyles = useFormGridStyles(config.grid);

	if (!currentStep_data) return null;

	const stepFields = getFieldsForStep(currentStep_data);

	return (
		<div className="min-h-[400px]">
			<div className="mb-6">
				<h3 className="text-xl font-semibold text-gray-900">{currentStep_data.title}</h3>
				{currentStep_data.description && <p className="mt-2 text-gray-600">{currentStep_data.description}</p>}
			</div>

			<div style={gridStyles}>
				{stepFields.map((field: FieldConfig) => (
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
	registry?: FormEngineProviderProps['registry'];
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
	registry,
}: FormRendererProps) {
	const isMultiStep = isMultiStepForm(config);

	return (
		<FormEngineProvider registry={registry}>
			<FormEngineFormProvider
				config={config}
				defaultValues={defaultValues}
				onSubmit={onSubmit}
				onChange={onChange}
				onAction={onAction}
				onValidationError={onValidationError}
			>
				<div className={`space-y-6 ${className}`} style={style}>
					{config.title && (!isMultiStep || !config.stepper?.showStepTitles) && (
						<div className="mb-6">
							<h2 className="text-2xl font-bold text-gray-900">{config.title}</h2>
							{config.description && <p className="mt-2 text-gray-600">{config.description}</p>}
						</div>
					)}

					<FormElementsRenderer config={config} />

					{!isMultiStep && showSubmitButton && (
						<SubmitButton
							submitButtonText={submitButtonText}
							submitButtonClassName={submitButtonClassName}
						/>
					)}
				</div>
			</FormEngineFormProvider>
		</FormEngineProvider>
	);
}
