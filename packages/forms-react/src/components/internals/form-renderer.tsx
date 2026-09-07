import { useMemo } from 'react';
import type React from 'react';
import { FormProvider } from '../form-provider';
import type { FormAdapter, FormProviderProps } from '../../adapters/types';
import { FormElement } from './field-renderer';
import { useFormGridStyles } from '@/hooks';
import { useFormInstanceActions, useOptionalFormEngine } from '@/hooks/use-form-context';
import { FormEngineProvider } from '../form-engine-provider';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormConfig, FormStep } from '@schema-engine/forms/schemas';
import { RecipeRenderer } from './recipe-renderer';
import {
	getRenderableSteps,
	isValidatedFormConfig,
	resolveFormRecipe,
	resolveValidatedConfig,
} from '@schema-engine/forms/lib/validate-form';
import { ValidatedFormConfigContext } from '../provider';

function StepFields({ step, config }: { step: FormStep; config: FormConfig }) {
	const gridStyles = useFormGridStyles(config.grid);

	if (!step?.elements) return null;

	return (
		<div style={gridStyles}>
			{step.elements.map((field, index) => (
				<FormElement
					key={field.id ?? `field-${index}`}
					config={field}
					className={field.className}
					style={field.style}
				/>
			))}
		</div>
	);
}

function FormElementsRenderer({ config, children }: { config: FormConfig; children?: React.ReactNode }) {
	const { currentStep } = useFormInstanceActions();
	const engineContext = useOptionalFormEngine();
	const recipe = resolveFormRecipe(config, engineContext?.engine);
	const steps = getRenderableSteps(config, recipe, currentStep);

	if (steps.length === 0) return null;

	return (
		<RecipeRenderer
			config={config}
			recipe={recipe}
			renderFields={() => (
				<>
					{steps.map((step) => (
						<StepFields key={step.id} step={step} config={config} />
					))}
				</>
			)}
		>
			{children}
		</RecipeRenderer>
	);
}

export interface FormRendererProps extends Omit<FormProviderProps, 'children'> {
	className?: string;
	style?: React.CSSProperties;
	engine?: FormEngine;
	adapter?: FormAdapter;
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
	configValidated,
}: Omit<FormRendererProps, 'engine' | 'adapter'> & { configValidated: boolean }) {
	return (
		<ValidatedFormConfigContext.Provider value={configValidated}>
			<FormProvider
				config={config}
				defaultValues={defaultValues}
				onSubmit={onSubmit}
				onChange={onChange}
				onAction={onAction}
			>
				<div className={`w-full min-h-full h-full ${className}`.trim()} style={style}>
					<FormElementsRenderer config={config}>{children}</FormElementsRenderer>
				</div>
			</FormProvider>
		</ValidatedFormConfigContext.Provider>
	);
}

export function FormRenderer({ engine, adapter, ...props }: FormRendererProps) {
	const inheritedEngine = useOptionalFormEngine();
	const resolvedEngine = engine ?? inheritedEngine?.engine;
	const config = useMemo(() => resolveValidatedConfig(props.config, resolvedEngine), [props.config, resolvedEngine]);
	const configValidated = isValidatedFormConfig(config);
	const validatedProps = { ...props, config, configValidated };
	if (!engine || !adapter) {
		return <FormRendererInner {...validatedProps} />;
	}

	return (
		<FormEngineProvider engine={engine} adapter={adapter} configValidated={configValidated}>
			<FormRendererInner {...validatedProps} />
		</FormEngineProvider>
	);
}
