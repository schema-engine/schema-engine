import type { ReactNode } from 'react';
import type { EngineOutputMaps, FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { FormAdapterContext } from '../adapters/context';
import type { FormAdapter } from '../adapters/types';
import { FormEngineContext } from './provider';

export interface FormEngineProviderProps<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
> {
	children: ReactNode;
	engine: CoreFormEngine<TElements, TRecipes, TActions, TOutputs>;
	/**
	 * Form library adapter. Import e.g. `rhfAdapter` from
	 * `@schema-engine/forms-react/adapters/react-hook-form`.
	 */
	adapter: FormAdapter;
}

export function FormEngineProvider<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
>({ children, engine, adapter }: FormEngineProviderProps<TElements, TRecipes, TActions, TOutputs>) {
	if (!adapter) {
		throw new Error(
			'FormEngineProvider requires an adapter. Pass one explicitly, e.g. rhfAdapter from @schema-engine/forms-react/adapters/react-hook-form.',
		);
	}

	if (!engine) {
		throw new Error('FormEngineProvider requires a FormEngine instance. Create one using createFormEngine()');
	}

	return (
		<FormAdapterContext.Provider value={adapter}>
			<FormEngineContext.Provider value={{ engine }}>{children}</FormEngineContext.Provider>
		</FormAdapterContext.Provider>
	);
}
