import type React from 'react';
import { FormProvider } from '../form-provider';
import type { FormProviderProps } from '../../adapters/types';
import { FormElement } from './field-renderer';
import { useFormGridStyles, useMultiStepForm } from '@/hooks';
import { useFormContext } from 'react-hook-form';
import { LayoutRenderer } from './layout-renderer';
import { StepperRenderer } from './stepper-renderer';

import type { FormConfig, FormStep } from '@schema-engine/forms/schemas';

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

	if (singleStep.layout && '$type' in singleStep.layout) {
		return (
			<LayoutRenderer
				step={singleStep}
				formMeta={{
					id: config.id,
					title: config.title,
					description: config.description,
				}}
			>
				<div style={gridStyles}>
					{singleStep.elements.map((field, index) => (
						<FormElement
							key={`field-${index}`}
							config={field}
							className={field.className}
							style={field.style}
						/>
					))}
				</div>
			</LayoutRenderer>
		);
	}

	return (
		<div style={gridStyles}>
			{singleStep.elements.map((field, index) => (
				<FormElement key={`field-${index}`} config={field} className={field.className} style={field.style} />
			))}
		</div>
	);
}

/**
 * Internal component for multi-step form rendering
 */
function MultiStepFormElementsRenderer({ config }: { config: FormConfig }) {
	const { formState } = useFormContext();
	const { currentStepIndex, stepStates, navigation } = useMultiStepForm(config);

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

	if (step.layout && '$type' in step.layout) {
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
}: FormRendererProps) {
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
			</div>
		</FormProvider>
	);
}
