import type React from 'react';
import { FormEngineFormProvider, type FormProviderProps } from './provider';
import { FormField } from './field-renderer';
import { useFormGridStyles } from './grid-hooks';
import { Stepper, useStepper } from './stepper';
import { useFormContext } from 'react-hook-form';
import type { FormConfig, FormStep, FieldConfig } from './types/form';

/**
 * Helper to get fields for a specific step - now fields are directly in steps
 */
function getFieldsForStep(step: FormStep): FieldConfig[] {
	return step.fields || [];
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
function FormFields({ config }: { config: FormConfig }) {
	// All forms now use steps - either single step or multi-step
	if (isMultiStepForm(config)) {
		return <MultiStepFormFields config={config} />;
	}

	// Single step form - render the first (and only) step fields directly
	return <SingleStepFormFields config={config} />;
}

/**
 * Component for single-step forms (only one step in the steps array)
 */
function SingleStepFormFields({ config }: { config: FormConfig }) {
	const gridStyles = useFormGridStyles(config.grid);
	const singleStep = config.steps[0];

	if (!singleStep?.fields) return null;

	return (
		<div style={gridStyles}>
			{singleStep.fields.map((field) => (
				<FormField key={field.id} config={field} className={field.className} style={field.style} />
			))}
		</div>
	);
}

/**
 * Internal component for multi-step form rendering
 */
function MultiStepFormFields({ config }: { config: FormConfig }) {
	const { trigger, getValues, setFocus, formState } = useFormContext();

	const handleStepChange = (stepIndex: number, step: FormStep) => {
		console.log(`Navigated to step ${stepIndex}: ${step.title}`);
	};

	// Validation function that uses trigger to validate current step fields
	const validateStep = async (stepIndex: number): Promise<boolean> => {
		const step = config.steps[stepIndex];
		if (!step?.fields) return true;

		// Get all field names for this step
		const fieldNames = step.fields.map((field) => field.name);

		try {
			// Use trigger to validate all fields in the current step
			const isValid = await trigger(fieldNames);

			if (!isValid) {
				// Find the first field with an error and focus on it
				const fieldsWithErrors = fieldNames.filter((fieldName) => formState.errors[fieldName]);

				if (fieldsWithErrors.length > 0) {
					// Focus on the first field with an error
					setFocus(fieldsWithErrors[0]);
					console.log(`Validation failed. Focused on field: ${fieldsWithErrors[0]}`);
				}
			}

			return isValid;
		} catch (error) {
			console.error('Validation error:', error);
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
			<StepperLayout config={config} validateStepFn={validateStep} getValuesFn={getValues} />
		</Stepper>
	);
}

/**
 * Layout component that handles different stepper orientations
 */
function StepperLayout({
	config,
	validateStepFn,
	getValuesFn,
}: {
	config: FormConfig;
	validateStepFn: (stepIndex: number) => Promise<boolean>;
	getValuesFn: () => any;
}) {
	const { currentStep } = useStepper();

	const handleSubmit = async () => {
		// Validate the current step before submitting
		const isValid = await validateStepFn(currentStep);

		if (!isValid) {
			console.log('Final step validation failed, cannot submit');
			return;
		}

		// Get form data and submit it
		const formData = getValuesFn();
		console.log('Multi-step form completed:', formData);

		// Show alert for demo purposes
		alert('Form submitted successfully!');
	};
	const orientation = config.stepper?.orientation || 'horizontal';

	if (orientation === 'vertical') {
		return (
			<div className="flex gap-12">
				{/* Vertical stepper on the left */}
				<div className="w-72 flex-shrink-0">
					<div className="sticky top-8">
						<Stepper.Header navigation={config.stepper} />
					</div>
				</div>

				{/* Content on the right */}
				<div className="flex-1 min-w-0">
					<Stepper.Content>
						<StepperFormContent config={config} />
					</Stepper.Content>

					<div className="mt-8">
						<Stepper.Navigation navigation={config.stepper} onSubmit={handleSubmit} />
					</div>
				</div>
			</div>
		);
	}

	// Horizontal layout (default)
	return (
		<>
			<Stepper.Header navigation={config.stepper} className="mb-8" />

			<Stepper.Content>
				<StepperFormContent config={config} />
			</Stepper.Content>

			<Stepper.Navigation navigation={config.stepper} onSubmit={handleSubmit} />
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

	// Get fields for current step - fields are now directly in the step
	const stepFields = getFieldsForStep(currentStep_data);

	return (
		<div className="min-h-[400px]">
			{/* Step Title and Description */}
			<div className="mb-6">
				<h3 className="text-xl font-semibold text-gray-900">{currentStep_data.title}</h3>
				{currentStep_data.description && <p className="mt-2 text-gray-600">{currentStep_data.description}</p>}
			</div>

			{/* Step Fields */}
			<div style={gridStyles}>
				{stepFields.map((field: FieldConfig) => (
					<FormField key={field.id} config={field} className={field.className} style={field.style} />
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
	registerActionHandlers,
	className = '',
	style,
	showSubmitButton = true,
	submitButtonText = 'Submit',
	submitButtonClassName = 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
}: FormRendererProps) {
	const isMultiStep = isMultiStepForm(config);

	return (
		<FormEngineFormProvider
			config={config}
			defaultValues={defaultValues}
			onSubmit={onSubmit}
			onChange={onChange}
			onAction={onAction}
			onValidationError={onValidationError}
			registerActionHandlers={registerActionHandlers}
		>
			<div className={`space-y-6 ${className}`} style={style}>
				{/* Form title - only show for single step or if no stepper header */}
				{config.title && (!isMultiStep || !config.stepper?.showStepTitles) && (
					<div className="mb-6">
						<h2 className="text-2xl font-bold text-gray-900">{config.title}</h2>
						{config.description && <p className="mt-2 text-gray-600">{config.description}</p>}
					</div>
				)}

				{/* Form fields */}
				<FormFields config={config} />

				{/* Submit button - only show for single step forms */}
				{!isMultiStep && showSubmitButton && (
					<div className="pt-4">
						<button type="submit" className={submitButtonClassName}>
							{submitButtonText}
						</button>
					</div>
				)}
			</div>
		</FormEngineFormProvider>
	);
}
