import { useContext, useMemo, useSyncExternalStore } from 'react';
import type { EngineOutputMaps, FormRuntime, FormWizard } from '@schema-engine/forms';
import { useFormStateContext } from './form-state/context';
import { getDefaultLayoutTheme } from '@schema-engine/layout';
import { FormEngineContext } from '../components/provider';
import type { FormEngineContextValue } from '../components/provider';

/**
 * The form's wizard: where it is, and the commands that move it.
 *
 * @remarks Must be used within a FormProvider. See {@link FormWizard} for the commands' outcomes and the steps' state.
 */
export function useFormWizard(): FormWizard {
	const { runtime } = useFormStateContext();
	const { current, navigating, steps } = useSyncExternalStore(
		runtime.subscribe,
		runtime.getSnapshot,
		runtime.getServerSnapshot,
	);
	return useMemo(
		() => ({ current, steps, navigating, next: runtime.next, back: runtime.back, goTo: runtime.goTo }),
		[runtime, current, navigating, steps],
	);
}

/**
 * The form's runtime: its container, its submission and its wizard, for what takes a form over whole, such as `registerFormAgentTool`.
 *
 * @remarks
 * Must be used within a FormProvider. A new config or engine starts a new runtime, and the provider's children remount with it, so an effect that registers it runs again.
 */
export function useFormRuntime(): FormRuntime {
	return useFormStateContext().runtime;
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
 * Id of the layout theme that owns the field being rendered.
 *
 * @remarks
 * Field hosts set `data-se-theme` to this value so the engine's generated
 * stylesheet matches them and nested grids stay isolated. Single resolver for
 * the React renderer — the engine context is the only source, with the library
 * default for hosts rendered outside a `FormEngineProvider`.
 */
export function useLayoutThemeId(): string {
	return (useOptionalFormEngine()?.engine.getLayout() ?? getDefaultLayoutTheme()).id;
}
