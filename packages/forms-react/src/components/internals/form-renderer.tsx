/**
 * Form grid CSS variables and alignment properties.
 *
 * @remarks
 * Variable emission is shared with the Radiant renderer
 * (`@schema-engine/forms/lib/grid-styles`); the responsive behavior lives in
 * the theme stylesheet the engine generates and the renderer emits inline.
 */
import {
	getFormGridVariables,
	type CompiledGrid,
	type NormalizedGridTheme,
} from '@schema-engine/forms/lib/grid-styles';
import type React from 'react';
import { useMemo } from 'react';
import { FormProvider } from '../form-provider';
import type { FormAdapter, FormProviderProps } from '../../adapters/types';
import { FormElements } from './form-elements';
import { useFormInstanceActions, useOptionalFormEngine } from '@/hooks/use-form-context';
import { FormEngineProvider } from '../form-engine-provider';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { RecipeRenderer } from './recipe-renderer';
import { getRenderableSteps, assertFormEngine, resolveFormRecipe } from '@schema-engine/forms/lib/validate-form';

function GridThemeStyle({ themeId, css }: { themeId: string; css: string }) {
	return (
		<style href={`se-grid-theme-${themeId}`} precedence="se-grid-theme" data-se-grid-theme={themeId}>
			{css}
		</style>
	);
}

function StepFields({
	step,
	config,
	theme,
}: {
	step: NormalizedFormConfig['steps'][number];
	config: NormalizedFormConfig;
	theme: NormalizedGridTheme;
}) {
	if (!step.elements.length) return null;

	return (
		<div className="se-form-grid" data-se-grid-theme={theme.id} style={getFormGridVariables(config.grid, theme)}>
			<FormElements elements={step.elements} />
		</div>
	);
}

function FormElementsRenderer({
	config,
	theme,
	children,
}: {
	config: NormalizedFormConfig;
	theme: NormalizedGridTheme;
	children?: React.ReactNode;
}) {
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
						<StepFields key={step.id} step={step} config={config} theme={theme} />
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
	compiledGrid,
	children,
}: Omit<FormRendererProps, 'engine' | 'adapter' | 'config'> & {
	config: NormalizedFormConfig;
	compiledGrid: CompiledGrid;
}) {
	const { theme, css } = compiledGrid;
	return (
		<FormProvider
			config={config}
			defaultValues={defaultValues}
			onSubmit={onSubmit}
			onChange={onChange}
			onAction={onAction}
		>
			<div className={`w-full min-h-full h-full ${className}`.trim()} style={style}>
				<GridThemeStyle themeId={theme.id} css={css} />
				<FormElementsRenderer config={config} theme={theme}>
					{children}
				</FormElementsRenderer>
			</div>
		</FormProvider>
	);
}

export function FormRenderer({ engine, adapter, ...props }: FormRendererProps) {
	const inheritedEngine = useOptionalFormEngine();
	const resolvedEngine = engine ?? inheritedEngine?.engine;
	const { config, compiledGrid } = useMemo(() => {
		assertFormEngine(resolvedEngine, props.config);
		return { config: resolvedEngine.validateForm(props.config), compiledGrid: resolvedEngine.getCompiledGrid() };
	}, [props.config, resolvedEngine]);
	const innerProps = { ...props, config, compiledGrid };
	if (!engine || !adapter) {
		return <FormRendererInner {...innerProps} />;
	}

	return (
		<FormEngineProvider engine={engine} adapter={adapter}>
			<FormRendererInner {...innerProps} />
		</FormEngineProvider>
	);
}
