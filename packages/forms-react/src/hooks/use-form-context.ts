import { useContext } from 'react';
import { useFormContext as useAdapterFormContext } from '@/adapters/context';
import { FormEngineContext, FormInstanceContext } from '../components/provider';
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
export function useFormInstanceActions(): FormInstanceContextValue {
	const context = useContext(FormInstanceContext);
	if (!context) {
		throw new Error('useFormInstanceActions must be used within a FormProvider');
	}
	return context;
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
