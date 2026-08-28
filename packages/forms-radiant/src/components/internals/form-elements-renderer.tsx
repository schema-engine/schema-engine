import type { JsxRenderable } from '@ecopages/jsx';
import type { FormConfig, FormStep } from '@schema-engine/forms/schemas';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormInstanceContextValue } from '@/contexts/form-instance-context';
import { getFormGridStyles } from '@/hooks/grid-styles';
import { LayoutRenderer } from './layout-renderer';
import { renderRegisteredElement } from './field-renderer';
import { StepperRenderer } from './stepper-renderer';
import type { StepperNavigation } from '@/components/steppers/types';

function isMultiStepForm(config: FormConfig): boolean {
	return config.steps.length > 1;
}

function renderFieldList(
	fields: FormEngine.ElementConfig[],
	engine: CoreFormEngine | undefined,
	gridStyles: Record<string, string | number | undefined>,
) {
	return (
		<div class="se-form-elements" style={gridStyles}>
			{fields.map((field) => (engine ? renderRegisteredElement(field, engine) : null))}
		</div>
	);
}

function renderStepFields(step: FormStep, config: FormConfig, engine?: CoreFormEngine) {
	if (!step?.elements) {
		return null;
	}

	return renderFieldList(step.elements, engine, getFormGridStyles(config.grid));
}

function StepContent({
	step,
	config,
	engine,
	stepIndex,
}: {
	step: FormStep;
	config: FormConfig;
	engine?: CoreFormEngine;
	stepIndex?: number;
}) {
	if (!step?.elements) {
		return null;
	}

	const formMeta = {
		id: config.id,
		title: config.title,
		description: config.description,
	};

	const stepMeta =
		typeof stepIndex === 'number'
			? {
					index: stepIndex,
					total: config.steps.length,
				}
			: undefined;

	if (step.layout && '$type' in step.layout) {
		return (
			<LayoutRenderer step={step} stepMeta={stepMeta} formMeta={formMeta} engine={engine}>
				{renderStepFields(step, config, engine)}
			</LayoutRenderer>
		);
	}

	return renderStepFields(step, config, engine);
}

function SingleStepFormElementsRenderer({ config, engine }: { config: FormConfig; engine?: CoreFormEngine }) {
	const singleStep = config.steps[0];
	if (!singleStep?.elements) {
		return null;
	}

	return <StepContent step={singleStep} config={config} engine={engine} />;
}

export function renderMultiStepForm(
	config: FormConfig,
	engine: CoreFormEngine | undefined,
	instance: FormInstanceContextValue,
): JsxRenderable {
	const currentStep = config.steps[instance.currentStep];
	if (!currentStep) {
		return null;
	}

	const navigation: StepperNavigation = {
		canGoNext: instance.currentStep < instance.totalSteps - 1,
		canGoPrevious: instance.currentStep > 0,
		isFirstStep: instance.currentStep === 0,
		isLastStep: instance.currentStep === instance.totalSteps - 1,
		goToStep: (index) => instance.goToStep(index),
		goToNextStep: () => instance.goToNextStep(),
		goToPreviousStep: () => instance.goToPreviousStep(),
	};

	const formMeta = {
		id: config.id,
		title: config.title,
		description: config.description,
	};
	const stepMeta = {
		index: instance.currentStep,
		total: config.steps.length,
	};

	const stepper = (
		<StepperRenderer
			form={config}
			steps={config.steps}
			currentStepIndex={instance.currentStep}
			stepStates={instance.stepStates}
			navigation={navigation}
			isSubmitting={instance.isSubmitting}
			engine={engine}
		>
			{renderStepFields(currentStep, config, engine)}
		</StepperRenderer>
	);

	if (currentStep.layout && '$type' in currentStep.layout) {
		return (
			<LayoutRenderer step={currentStep} stepMeta={stepMeta} formMeta={formMeta} engine={engine}>
				{stepper}
			</LayoutRenderer>
		);
	}

	return stepper;
}

export function FormElementsRenderer({ config, engine }: { config: FormConfig; engine?: CoreFormEngine }) {
	if (isMultiStepForm(config)) {
		return null;
	}

	return <SingleStepFormElementsRenderer config={config} engine={engine} />;
}
