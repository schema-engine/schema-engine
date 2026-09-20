import type { ReactNode } from 'react';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { FormAdapterContext } from '../adapters/context';
import type { FormAdapter } from '../adapters/types';
import { FormEngineContext } from './provider';

export interface FormEngineProviderProps {
	children: ReactNode;
	engine: CoreFormEngine;
	/**
	 * Form library adapter. Import e.g. `rhfAdapter` from
	 * `@schema-engine/forms-react/adapters/react-hook-form`.
	 */
	adapter: FormAdapter;
}

export function FormEngineProvider({ children, engine, adapter }: FormEngineProviderProps) {
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
