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
import { useMemo } from 'react';
import { FormProvider } from '../form-provider';
import type { FormProviderProps } from '../../hooks/form-state/types';
import { FormElements } from './form-elements';
import { useFormWizard, useOptionalFormEngine } from '@/hooks/use-form-context';
import { FormEngineProvider } from '../form-engine-provider';
import {
	type EngineOutputMaps,
	type FormEngineRuntime as FormEngine,
	type FormValues,
	type NormalizedFormConfig,
	isNormalizedFormConfig,
	type FormConfig,
	getRenderableSteps,
	assertFormEngine,
	stepGrid,
} from '@schema-engine/forms';
import { getViewRecipe } from '@schema-engine/forms/recipes';
import { RecipeRenderer } from './recipe-renderer';

function LayoutThemeStyle({ themeId, css }: { themeId: string; css: string }) {
	return (
		<style href={`se-layout-theme-${themeId}`} precedence="se-layout-theme" data-se-theme-css={themeId}>
			{css}
		</style>
	);
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
	const { current } = useFormWizard();
	const engineContext = useOptionalFormEngine<TElements, TRecipes, TActions, TOutputs>();
	const recipe = engineContext ? getViewRecipe(engineContext.engine, config) : undefined;
	const steps = getRenderableSteps(config, current);

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

/**
 * @template TValues - The values the form submits, which the normalized `config` carries: `onSubmit`, `onAction` and
 * `defaultValues` are typed by it. A config passed as authoring input has none, so they are {@link FormValues}.
 */
export interface FormRendererProps<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
	TValues extends FormValues = FormValues,
> extends Omit<FormProviderProps<TOutputs, TValues>, 'children' | 'config'> {
	/**
	 * The form: the normalized config of `engine.defineForm` or `engine.validateForm`, or an authoring config.
	 *
	 * @remarks An authoring config carries no values type, so it is accepted only where `TValues` is {@link FormValues}: a callback typed by other values needs a normalized config that says so.
	 */
	config:
		| NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions'], TValues>
		| (FormValues extends TValues ? FormConfig<TElements, TRecipes, TActions> : never);
	className?: string;
	style?: React.CSSProperties;
	engine?: FormEngine<TElements, TRecipes, TActions, TOutputs>;
	children?: React.ReactNode;
}

function FormRendererInner<
	TElements extends Record<string, unknown>,
	TRecipes extends Record<string, unknown>,
	TActions extends Record<string, unknown>,
	TOutputs extends EngineOutputMaps,
	TValues extends FormValues,
>({
	config,
	defaultValues,
	onSubmit,
	onChange,
	onAction,
	onActionResults,
	navigate,
	formatIssue,
	className = '',
	style,
	layout,
	children,
}: Omit<FormRendererProps<TElements, TRecipes, TActions, TOutputs, TValues>, 'engine' | 'config'> & {
	config: NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions'], TValues>;
	layout: LayoutTheme;
}) {
	return (
		<FormProvider
			config={config}
			defaultValues={defaultValues}
			onSubmit={onSubmit}
			onChange={onChange}
			onAction={onAction}
			onActionResults={onActionResults}
			navigate={navigate}
			formatIssue={formatIssue}
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

/**
 * The normalized form of a `FormRenderer` config, which keeps the values type of a normalized config.
 *
 * @remarks
 * A normalized config is validated as it is, so it keeps the type it carries. An authoring config carries none, and
 * `FormRendererProps['config']` accepts one only where `TValues` is `FormValues`, so the form it normalizes to is
 * a form of `TValues`; the engine has no signature that says so for a generic `TValues`.
 */
function normalize<
	TElements extends Record<string, unknown>,
	TRecipes extends Record<string, unknown>,
	TActions extends Record<string, unknown>,
	TOutputs extends EngineOutputMaps,
	TValues extends FormValues,
>(
	engine: FormEngine<TElements, TRecipes, TActions, TOutputs>,
	config: FormRendererProps<TElements, TRecipes, TActions, TOutputs, TValues>['config'],
): NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions'], TValues> {
	if (isNormalizedFormConfig(config)) return engine.validateForm(config);
	return engine.validateForm(config) as NormalizedFormConfig<
		TOutputs['elements'],
		TOutputs['recipes'],
		TOutputs['actions'],
		TValues
	>;
}

/**
 * Renders a form: its fields, its recipe and the provider that runs it.
 *
 * @remarks
 * A normalized config (`engine.defineForm`, or `engine.validateForm` with a `values` schema) types `onSubmit`,
 * `onAction` and `defaultValues` by the values it carries, so a callback needs no annotation and no cast. Validating a
 * normalized config returns it unchanged, so it keeps that type; an authoring config has none and is {@link FormValues}.
 */
export function FormRenderer<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
	TValues extends FormValues = FormValues,
>({ engine, ...props }: FormRendererProps<TElements, TRecipes, TActions, TOutputs, TValues>) {
	const inheritedEngine = useOptionalFormEngine<TElements, TRecipes, TActions, TOutputs>();
	const resolvedEngine = engine ?? inheritedEngine?.engine;
	const { config, layout } = useMemo(() => {
		assertFormEngine(resolvedEngine, props.config);
		return { config: normalize(resolvedEngine, props.config), layout: resolvedEngine.getLayout() };
	}, [props.config, resolvedEngine]);
	const innerProps = { ...props, config, layout };

	if (!resolvedEngine) {
		return <FormRendererInner {...innerProps} />;
	}

	return (
		<FormEngineProvider engine={resolvedEngine}>
			<FormRendererInner {...innerProps} />
		</FormEngineProvider>
	);
}
