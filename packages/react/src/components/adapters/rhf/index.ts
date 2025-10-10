import type { FormAdapter } from '../types';
import { useFormContext } from './hooks/use-form-context';
import { useFormField } from './hooks/use-form-field';
import { useWatchField } from './hooks/use-watch-field';
import { FormProvider } from './form-provider';

async function validateField(_name: string): Promise<boolean> {
	// Implementation will use RHF's trigger method
	// This will be called through the adapter context
	throw new Error('validateField must be called through form context');
}

async function validateFields(_names: string[]): Promise<boolean> {
	// Implementation will use RHF's trigger method
	// This will be called through the adapter context
	throw new Error('validateFields must be called through form context');
}

export const rhfAdapter: FormAdapter = {
	useFormContext,
	useFormField,
	useWatchField,
	FormProvider,
	validateField,
	validateFields,
};
