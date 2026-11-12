import { useContext, useMemo } from 'react';
import type { StepStates } from '@schema-engine/forms';
import type { EngineOutputMaps } from '@schema-engine/forms/engine/form-engine';
import { getDefaultGridTheme, getGridVariables, type CssVariables } from '@schema-engine/layout';
import { FormEngineContext, FormInstanceContext } from '../components/provider';
import { FormStepStateContext } from '../components/form-step-state-context';
import type { FormEngineContextValue, FormInstanceContextValue } from '../components/provider';

/**
 * Hook to access form actions and navigation
 * Must be used within a FormProvider
 */
export function useFormInstanceActions(): FormInstanceContextValue & { stepStates: StepStates } {
	const context = useContext(FormInstanceContext);
	const stepStates = useContext(FormStepStateContext);
	if (!context || !stepStates) {
		throw new Error('useFormInstanceActions must be used within a FormProvider');
	}
	return useMemo(() => ({ ...context, stepStates }), [context, stepStates]);
}

/**
 * Hook to access the form engine context
 * Must be used within a FormEngineProvider
 */
export function useFormEngine<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
>(): FormEngineContextValue<TElements, TRecipes, TActions, TOutputs> {
	const context = useContext(FormEngineContext);
	if (!context) {
		throw new Error('useFormEngine must be used within a FormEngineProvider');
	}
	return context as unknown as FormEngineContextValue<TElements, TRecipes, TActions, TOutputs>;
}

export function useOptionalFormEngine<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
>(): FormEngineContextValue<TElements, TRecipes, TActions, TOutputs> | null {
	const context = useContext(FormEngineContext);
	return context ? (context as unknown as FormEngineContextValue<TElements, TRecipes, TActions, TOutputs>) : null;
}

/**
 * Theme id of the grid that owns the field being rendered.
 *
 * @remarks
 * Field hosts set `data-se-grid-theme` to this value so the engine's generated
 * stylesheet matches them and nested grids stay isolated. Single resolver for
 * the React renderer — the engine context is the only source, with the library
 * default for hosts rendered outside a `FormEngineProvider`.
 */
export function useGridThemeId(): string {
	return useOptionalFormEngine()?.engine.getGridTheme().id ?? getDefaultGridTheme().id;
}

/**
 * Props that make an element's children a grid of their own.
 *
 * @remarks
 * A container (a fieldset, an array row) lays its direct children out in a grid
 * the way a step does: spread the result on the wrapper of its `FormElements`.
 * The grid takes twelve tracks when a child sets `width` or `offset`, and
 * otherwise stays the engine's single column. The theme comes from the engine
 * context, with the library default outside a `FormEngineProvider`.
 */
export function useChildGridProps(elements: readonly unknown[]): {
	className: string;
	'data-se-grid-theme': string;
	style: CssVariables;
} {
	const theme = useOptionalFormEngine()?.engine.getGridTheme() ?? getDefaultGridTheme();
	return {
		className: 'se-form-grid',
		'data-se-grid-theme': theme.id,
		style: getGridVariables(undefined, theme, elements),
	};
}
