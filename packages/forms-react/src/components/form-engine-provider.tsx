import { useMemo, type ReactNode } from 'react';
import type { EngineOutputMaps, FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { FormEngineContext, createFormEngineContextValue } from './provider';

export interface FormEngineProviderProps<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
> {
	children: ReactNode;
	engine: CoreFormEngine<TElements, TRecipes, TActions, TOutputs>;
}

export function FormEngineProvider<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
>({ children, engine }: FormEngineProviderProps<TElements, TRecipes, TActions, TOutputs>) {
	const value = useMemo(() => createFormEngineContextValue(engine), [engine]);

	if (!engine) {
		throw new Error('FormEngineProvider requires a FormEngine instance. Create one using createFormEngine()');
	}

	return <FormEngineContext.Provider value={value}>{children}</FormEngineContext.Provider>;
}
