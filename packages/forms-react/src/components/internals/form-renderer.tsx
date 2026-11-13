/**
 * Form grid CSS variables and alignment properties.
 *
 * @remarks
 * Variable emission is shared with the Radiant renderer
 * (`@schema-engine/layout`); the responsive behavior lives in
 * the theme stylesheet the engine generates and the renderer emits inline.
 */
import { GRID_CLASS, getAppearanceAttributes, getGridVariables, type LayoutTheme } from '@schema-engine/layout';
import type React from 'react';
import { useContext, useMemo } from 'react';
import { FormProvider } from '../form-provider';
import type { FormAdapter, FormProviderProps } from '../../adapters/types';
import { FormElements } from './form-elements';
import { useFormInstanceActions, useOptionalFormEngine } from '@/hooks/use-form-context';
import { FormAdapterContext } from '../../adapters/context';
import { FormEngineProvider } from '../form-engine-provider';
import type { EngineOutputMaps, FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { getViewRecipe } from '@schema-engine/forms/recipes';
import { RecipeRenderer } from './recipe-renderer';
import { getRenderableSteps, assertFormEngine, stepGrid } from '@schema-engine/forms/lib/validate-form';

function LayoutThemeStyle({ themeId, css }: { themeId: string; css: string }) {
	return (
		<style href={`se-layout-theme-${themeId}`} precedence="se-layout-theme" data-se-theme-css={themeId}>
			{css}
		</style>
	);
}

const formConfigIdentities = new WeakMap<NormalizedFormConfig, number>();
let nextFormConfigIdentity = 0;

/**
 * @remarks The normalized config identity marks the lifetime of the adapter's form instance.
 */
function getFormConfigIdentity(config: NormalizedFormConfig): number {
	const existingIdentity = formConfigIdentities.get(config);
	if (existingIdentity !== undefined) return existingIdentity;

	const identity = nextFormConfigIdentity++;
	formConfigIdentities.set(config, identity);
	return identity;
}

function StepFields({
	step,
	config,
	layout,
}: {
	step: NormalizedFormConfig['steps'][number];
	config: NormalizedFormConfig;
	layout: LayoutTheme;
}) {
	return (
		<div
			className={`se-form-step ${step.className ?? ''}`.trim()}
			data-se-step={step.id}
			style={step.style}
			{...getAppearanceAttributes(step.appearance)}
		>
			{step.elements.length > 0 && (
				<div
					className={`se-form-grid ${GRID_CLASS}`}
					data-se-theme={layout.id}
					style={getGridVariables(stepGrid(config, step), layout.grid, step.elements)}
				>
					<FormElements elements={step.elements} />
				</div>
			)}
		</div>
	);
}

function FormElementsRenderer<
	TElements extends Record<string, unknown>,
	TRecipes extends Record<string, unknown>,
	TActions extends Record<string, unknown>,
	TOutputs extends EngineOutputMaps,
>({
	config,
	layout,
	children,
}: {
	config: NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions']>;
	layout: LayoutTheme;
	children?: React.ReactNode;
}) {
	const { currentStep } = useFormInstanceActions();
	const engineContext = useOptionalFormEngine<TElements, TRecipes, TActions, TOutputs>();
	const recipe = engineContext ? getViewRecipe(engineContext.engine, config) : undefined;
	const steps = getRenderableSteps(config, currentStep);

	if (steps.length === 0) return null;

	return (
		<RecipeRenderer
			config={config}
			recipe={recipe}
			renderFields={() => (
				<>
					{steps.map((step) => (
						<StepFields key={step.id} step={step} config={config} layout={layout} />
					))}
				</>
			)}
		>
			{children}
		</RecipeRenderer>
	);
}

export interface FormRendererProps<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
> extends Omit<FormProviderProps<Record<string, unknown>, TElements, TRecipes, TActions, TOutputs>, 'children'> {
	className?: string;
	style?: React.CSSProperties;
	engine?: FormEngine<TElements, TRecipes, TActions, TOutputs>;
	adapter?: FormAdapter;
	children?: React.ReactNode;
}

function FormRendererInner<
	TElements extends Record<string, unknown>,
	TRecipes extends Record<string, unknown>,
	TActions extends Record<string, unknown>,
	TOutputs extends EngineOutputMaps,
>({
	config,
	defaultValues,
	onSubmit,
	onChange,
	onAction,
	onActionResults,
	className = '',
	style,
	layout,
	children,
}: Omit<FormRendererProps<TElements, TRecipes, TActions, TOutputs>, 'engine' | 'adapter' | 'config'> & {
	config: NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions']>;
	layout: LayoutTheme;
}) {
	return (
		<FormProvider
			key={getFormConfigIdentity(config)}
			config={config}
			defaultValues={defaultValues}
			onSubmit={onSubmit}
			onChange={onChange}
			onAction={onAction}
			onActionResults={onActionResults}
		>
			<div className={`se-form ${className}`.trim()} style={style}>
				<LayoutThemeStyle themeId={layout.id} css={layout.css} />
				<FormElementsRenderer config={config} layout={layout}>
					{children}
				</FormElementsRenderer>
			</div>
		</FormProvider>
	);
}

export function FormRenderer<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
>({ engine, adapter, ...props }: FormRendererProps<TElements, TRecipes, TActions, TOutputs>) {
	const inheritedEngine = useOptionalFormEngine<TElements, TRecipes, TActions, TOutputs>();
	const inheritedAdapter = useContext(FormAdapterContext);
	const resolvedEngine = engine ?? inheritedEngine?.engine;
	const resolvedAdapter = adapter ?? inheritedAdapter ?? undefined;
	const { config, layout } = useMemo(() => {
		assertFormEngine(resolvedEngine, props.config);
		return {
			config: resolvedEngine.validateForm(props.config),
			layout: resolvedEngine.getLayout(),
		};
	}, [props.config, resolvedEngine]);
	const innerProps = { ...props, config, layout };

	if (!resolvedEngine) {
		return <FormRendererInner {...innerProps} />;
	}

	if (!resolvedAdapter) {
		throw new Error(
			'FormRenderer requires an adapter when an engine is supplied. Pass `adapter` or render inside FormEngineProvider.',
		);
	}

	return (
		<FormEngineProvider engine={resolvedEngine} adapter={resolvedAdapter}>
			<FormRendererInner {...innerProps} />
		</FormEngineProvider>
	);
}
