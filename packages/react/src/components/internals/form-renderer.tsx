import type React from 'react';
import { type FormEngineProps, FormEngine } from '../adapter-provider';
import { FormProvider } from '../form-provider';
import type { FormProviderProps } from '../adapters/types';
import { FormElement } from './field-renderer';
import { useFormGridStyles } from '@/hooks';
import { Stepper, useStepper } from '../stepper';
import { useFormContext } from 'react-hook-form';
import { logger } from '@/lib/logger';
import { LayoutRenderer } from './layout-renderer';
import { reactStepperRegistry } from '@/registries/stepper-registry';
import type {
	FieldConfig,
	FormConfig,
	FormStep,
	StepNavigationConfig,
	FormStepperConfig,
} from '@json-form-engine/core/schemas';

/**
 * Helper function to create default step navigation config
 */
function createStepNavigationConfig(stepperConfig?: FormStepperConfig): StepNavigationConfig {
	if (!stepperConfig) {
		return {
			showStepNumbers: true,
			showStepTitles: true,
			orientation: 'horizontal',
			variant: 'default',
			position: 'top',
			allowStepJumping: false,
			validateOnNext: true,
		};
	}

	// Extract navigation-relevant properties, provide defaults for required fields
	return {
		showStepNumbers: true,
		showStepTitles: true,
		orientation: (stepperConfig.orientation as 'horizontal' | 'vertical') || 'horizontal',
		variant: 'default',
		position: 'top',
		allowStepJumping: false,
		validateOnNext: true,
		// Pass through any other properties that might be relevant
		...stepperConfig,
	};
}

/**
 * Shared stepper navigation interface used by all stepper components
 */
interface SharedStepperNavigation {
	canGoNext: boolean;
	canGoPrevious: boolean;
	isFirstStep: boolean;
	isLastStep: boolean;
	goToStep: (stepIndex: number) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
}

/**
 * Shared step info interface used by all stepper components
 */
interface SharedStepInfo {
	id: string;
	title?: string;
	description?: string;
	index: number;
	total: number;
	isActive: boolean;
	isCompleted: boolean;
	isValid: boolean;
	isVisited: boolean;
}

/**
 * Shared stepper component props interface
 */
interface SharedStepperComponentProps {
	steps: SharedStepInfo[];
	currentStepIndex: number;
	navigation: SharedStepperNavigation;
	config?: Record<string, unknown>;
	form: {
		id: string;
		title?: string;
		description?: string;
	};
	children?: React.ReactNode;
}

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

	if (singleStep.layout && '__layoutId' in singleStep.layout) {
		return (
			<LayoutRenderer
				step={singleStep}
				stepMeta={{
					index: 0,
					total: 1,
				}}
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

	const hasRegistryStepperConfig = config.stepper && '__stepperId' in config.stepper;

	if (hasRegistryStepperConfig) {
		const stepperConfig = config.stepper as { __stepperId: string } & Record<string, unknown>;

		const stepperResult = reactStepperRegistry.get(stepperConfig.__stepperId);

		if (stepperResult) {
			const navigationConfig = createStepNavigationConfig(config.stepper);

			return (
				<Stepper
					steps={config.steps}
					navigation={navigationConfig}
					validationMode={config.mode}
					onStepChange={handleStepChange}
					getFormData={getValues}
					validateStep={validateStep}
				>
					<RegistryStepperLayout
						config={config}
						stepperComponent={stepperResult.component}
						stepperConfig={stepperResult.defaultConfig}
					>
						<StepperFormContent config={config} />
					</RegistryStepperLayout>
				</Stepper>
			);
		}

		console.warn(`Stepper '${stepperConfig.__stepperId}' not found in registry. Using fallback.`);
	}

	const navigationConfig = createStepNavigationConfig(config.stepper);

	return (
		<Stepper
			steps={config.steps}
			navigation={navigationConfig}
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
	const navigationConfig = createStepNavigationConfig(config.stepper);

	if (orientation === 'vertical') {
		return (
			<div className="flex gap-12">
				<div className="w-72 flex-shrink-0">
					<div className="sticky top-8">
						<Stepper.Header navigation={navigationConfig} />
					</div>
				</div>

				<div className="flex-1 min-w-0">
					<Stepper.Content>
						<StepperFormContent config={config} />
					</Stepper.Content>

					<div className="mt-8">
						<Stepper.Navigation navigation={navigationConfig} />
					</div>
				</div>
			</div>
		);
	}

	return (
		<>
			<Stepper.Header navigation={navigationConfig} className="mb-8" />

			<Stepper.Content>
				<StepperFormContent config={config} />
			</Stepper.Content>

			<Stepper.Navigation navigation={navigationConfig} />
		</>
	);
}

interface RegistryStepperComponent {
	component: React.ComponentType<SharedStepperComponentProps>;
	config?: Record<string, unknown>;
}

/**
 * Layout component for registry-based steppers that uses actual stepper hook
 */
function RegistryStepperLayout({
	config,
	stepperComponent: StepperComponent,
	stepperConfig,
	children,
}: {
	config: FormConfig;
	stepperComponent: RegistryStepperComponent['component'];
	stepperConfig: Record<string, unknown> | undefined;
	children: React.ReactNode;
}) {
	const { currentStep, steps, goToStep, goToNext, goToPrevious, canGoNext, canGoPrevious, isFirstStep, isLastStep } =
		useStepper();

	// Create step info for stepper component using real stepper state
	const stepInfos = steps.map((step, index) => ({
		id: step.id,
		title: step.title,
		description: step.description,
		index,
		total: steps.length,
		isActive: index === currentStep,
		isCompleted: index < currentStep,
		isValid: true, // TODO: integrate with validation state
		isVisited: index <= currentStep,
	}));

	// Use real navigation controls from stepper hook
	const navigation = {
		canGoNext,
		canGoPrevious,
		isFirstStep,
		isLastStep,
		goToStep,
		goToNextStep: goToNext,
		goToPreviousStep: goToPrevious,
	};

	// Let the stepper component handle its own layout - just pass children through
	return (
		<StepperComponent
			steps={stepInfos}
			currentStepIndex={currentStep}
			navigation={navigation}
			config={stepperConfig}
			form={{
				id: config.id,
				title: config.title,
				description: config.description,
			}}
		>
			{children}
		</StepperComponent>
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
	registry?: FormEngineProps['registry'];
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
		<FormEngine registry={registry}>
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
						<SubmitButton
							submitButtonText={submitButtonText}
							submitButtonClassName={submitButtonClassName}
						/>
					)}
				</div>
			</FormProvider>
		</FormEngine>
	);
}
