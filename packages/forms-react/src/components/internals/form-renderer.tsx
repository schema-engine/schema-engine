import type React from 'react';
import { FormProvider } from '../form-provider';
import type { FormAdapter, FormProviderProps } from '../../adapters/types';
import { FormElement } from './field-renderer';
import { useFormGridStyles } from '@/hooks';
import { useFormContext } from '@/adapters/context';
import { LayoutRenderer } from './layout-renderer';
import { StepperRenderer } from './stepper-renderer';
import { useFormInstanceActions } from '@/hooks/use-form-context';
import { FormEngineProvider } from '../form-engine-provider';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';

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

function createInitialStepStates(config: FormConfig) {
	return {
		completed: config.steps.map(() => false),
		valid: config.steps.map(() => false),
		visited: config.steps.map(() => false),
	};
}

/**
 * Internal component for multi-step form rendering
 */
function MultiStepFormElementsRenderer({ config }: { config: FormConfig }) {
	const { formState } = useFormContext();
	const { stepStates, currentStep, navigation } = useFormInstanceActions();

	return (
		<StepperRenderer
			form={config}
			steps={config.steps}
			currentStepIndex={currentStep}
			stepStates={stepStates ?? createInitialStepStates(config)}
			navigation={navigation}
			isSubmitting={formState.isSubmitting}
		>
			<StepContent step={config.steps[currentStep]} config={config} />
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
	/**
	 * Form engine instance. Supply it together with `adapter` to let this
	 * renderer provide its own FormEngine context; omit both when a parent
	 * `FormEngineProvider` already provides it.
	 */
	engine?: FormEngine;
	/**
	 * Form library adapter, supplied together with `engine`. Import e.g.
	 * `rhfAdapter` from `@schema-engine/forms-react/adapters/react-hook-form`.
	 */
	adapter?: FormAdapter;
	/**
	 * Rendered inside the form context, after the fields. Use it to mount
	 * form-aware extras such as `FormDebugger` from
	 * `@schema-engine/forms-react/components/form-debugger`.
	 */
	children?: React.ReactNode;
}

function FormRendererInner({
	config,
	defaultValues,
	onSubmit,
	onChange,
	onAction,
	className = '',
	style,
	children,
}: Omit<FormRendererProps, 'engine' | 'adapter'>) {
	return (
		<FormProvider
			config={config}
			defaultValues={defaultValues}
			onSubmit={onSubmit}
			onChange={onChange}
			onAction={onAction}
		>
			<div className={`space-y-6 ${className}`} style={style}>
				<FormElementsRenderer config={config} />
			</div>
			{children}
		</FormProvider>
	);
}

/**
 * Main form renderer component that renders a complete form from configuration
 */
export function FormRenderer({ engine, adapter, ...props }: FormRendererProps) {
	if (!engine || !adapter) {
		return <FormRendererInner {...props} />;
	}

	return (
		<FormEngineProvider engine={engine} adapter={adapter}>
			<FormRendererInner {...props} />
		</FormEngineProvider>
	);
}
