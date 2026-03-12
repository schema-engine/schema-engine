import type { FormAdapter } from '../types';
import { useFormContext } from './hooks/use-form-context';
import { useFormField } from './hooks/use-form-field';
import { useWatchField } from './hooks/use-watch-field';
import { FormProvider } from './form-provider';

export const rhfAdapter: FormAdapter = {
	useFormContext,
	useFormField,
	useWatchField,
	FormProvider,
};
