import { useMemo } from 'react';
import type React from 'react';
import { FormProvider } from '../form-provider';
import type { FormAdapter, FormProviderProps } from '../../adapters/types';
import { FormElements } from './form-elements';
import { useFormGridStyles } from '@/hooks';
import { useFormInstanceActions, useOptionalFormEngine } from '@/hooks/use-form-context';
import { FormEngineProvider } from '../form-engine-provider';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { RecipeRenderer } from './recipe-renderer';
import { getRenderableSteps, assertFormEngine, resolveFormRecipe } from '@schema-engine/forms/lib/validate-form';

function StepFields({ step, config }: { step: NormalizedFormConfig['steps'][number]; config: NormalizedFormConfig }) {
	const gridStyles = useFormGridStyles(config.grid);

	if (!step.elements.length) return null;

	return (
		<div style={gridStyles}>
			<FormElements elements={step.elements} />
		</div>
	);
}

function FormElementsRenderer({ config, children }: { config: NormalizedFormConfig; children?: React.ReactNode }) {
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
}: Omit<FormRendererProps, 'engine' | 'adapter' | 'config'> & { config: NormalizedFormConfig }) {
	return (
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
	);
}

export function FormRenderer({ engine, adapter, ...props }: FormRendererProps) {
	const inheritedEngine = useOptionalFormEngine();
	const resolvedEngine = engine ?? inheritedEngine?.engine;
	const config = useMemo(() => {
		assertFormEngine(resolvedEngine, props.config);
		return resolvedEngine.validateForm(props.config);
	}, [props.config, resolvedEngine]);
	const innerProps = { ...props, config };
	if (!engine || !adapter) {
		return <FormRendererInner {...innerProps} />;
	}

	return (
		<FormEngineProvider engine={engine} adapter={adapter}>
			<FormRendererInner {...innerProps} />
		</FormEngineProvider>
	);
}
