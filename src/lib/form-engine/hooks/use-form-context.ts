import { useContext } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormEngineContext, FormInstanceContext } from '../provider';
import type { FormEngineContextValue, FormInstanceContextValue } from '../provider';

/**
 * Hook to get the current form instance from React Hook Form
 * Must be used within a FormEngineFormProvider
 */
export function useFormInstance() {
	const form = useFormContext();
	if (!form) {
		throw new Error('useFormInstance must be used within a FormEngineFormProvider');
	}
	return form;
}

/**
 * Hook to access form actions and navigation
 * Must be used within a FormEngineFormProvider
 */
export function useFormInstanceActions(): FormInstanceContextValue {
	const context = useContext(FormInstanceContext);
	if (!context) {
		throw new Error('useFormInstanceActions must be used within a FormEngineFormProvider');
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
