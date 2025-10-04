import { rhfAdapter } from './rhf';
import type { FormAdapter } from './types';

/**
 * Registry of available form adapters
 */
export const adapterRegistry: Record<string, FormAdapter> = {
	rhf: rhfAdapter,
};

export type AdapterType = keyof typeof adapterRegistry;

/**
 * Get an adapter by name
 */
export function getAdapter(name: AdapterType): FormAdapter {
	return adapterRegistry[name];
}

/**
 * Check if an adapter is available
 */
export function isAdapterAvailable(name: string): name is AdapterType {
	return name in adapterRegistry;
}
