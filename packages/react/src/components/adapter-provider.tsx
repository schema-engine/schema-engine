import type { ReactNode } from 'react';
import type { FormEngine as CoreFormEngine } from '@json-form-engine/core/engine/form-engine';
import { FormAdapterContext } from '../adapters/context';
import { rhfAdapter } from '../adapters/rhf';
import type { FormAdapter } from '../adapters/types';
import { FormEngineContext } from './provider';

/**
 * Props for FormEngineProvider
 */
export interface FormEngineProviderProps {
	children: ReactNode;
	engine: CoreFormEngine;
	/**
	 * Form library adapter - must be an adapter object implementing FormAdapter interface.
	 * Import the adapter you want to use (e.g., rhfAdapter for React Hook Form)
	 */
	adapter?: FormAdapter;
}

/**
 * Main form engine provider - handles adapter selection and provides FormEngine instance
 */
export function FormEngineProvider({ children, engine, adapter = rhfAdapter }: FormEngineProviderProps) {
	if (!adapter) {
		throw new Error('FormEngineProvider requires an adapter. Import and pass an adapter (e.g., rhfAdapter)');
	}

	if (!engine) {
		throw new Error('FormEngineProvider requires a FormEngine instance. Create one using createReactFormEngine()');
	}

	return (
		<FormAdapterContext.Provider value={adapter}>
			<FormEngineContext.Provider value={{ engine }}>{children}</FormEngineContext.Provider>
		</FormAdapterContext.Provider>
	);
}
