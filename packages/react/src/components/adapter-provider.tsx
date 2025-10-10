import type { ReactNode } from 'react';
import { reactFormFieldRegistry } from '@/registries/field-registry';
import type { FormFieldComponentRegistry } from '@json-form-engine/core/schemas/registry';
import { FormAdapterContext } from './adapters/context';
import { rhfAdapter } from './adapters/rhf';
import type { FormAdapter } from './adapters/types';
import { FormEngineContext } from './provider';

/**
 * Props for FormEngine
 */
export interface FormEngineProps {
	children: ReactNode;
	registry?: FormFieldComponentRegistry;
	/**
	 * Form library adapter - must be an adapter object implementing FormAdapter interface.
	 * Import the adapter you want to use (e.g., rhfAdapter for React Hook Form)
	 */
	adapter?: FormAdapter;
}

/**
 * Main form engine provider - handles adapter selection and component registry
 */
export function FormEngine({ children, registry = reactFormFieldRegistry, adapter = rhfAdapter }: FormEngineProps) {
	if (!adapter) {
		throw new Error('FormEngine requires an adapter. Import and pass an adapter (e.g., rhfAdapter)');
	}

	return (
		<FormAdapterContext.Provider value={adapter}>
			<FormEngineContext.Provider value={{ registry }}>{children}</FormEngineContext.Provider>
		</FormAdapterContext.Provider>
	);
}
