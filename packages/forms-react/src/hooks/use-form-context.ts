import { useContext, useMemo } from 'react';
import type { StepStates } from '@schema-engine/forms';
import { getDefaultGridTheme } from '@schema-engine/forms/lib/grid-styles';
import { useFormContext as useAdapterFormContext } from '@/adapters/context';
import { FormEngineContext, FormInstanceContext } from '../components/provider';
import { FormStepStateContext } from '../components/form-step-state-context';
import type { FormEngineContextValue, FormInstanceContextValue } from '../components/provider';

/**
 * Hook to get the current form instance from the active adapter
 * Must be used within a FormProvider
 */
export function useFormInstance() {
	return useAdapterFormContext();
}

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
export function useFormEngine(): FormEngineContextValue {
	const context = useContext(FormEngineContext);
	if (!context) {
		throw new Error('useFormEngine must be used within a FormEngineProvider');
	}
	return context;
}

export function useOptionalFormEngine(): FormEngineContextValue | null {
	return useContext(FormEngineContext);
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
