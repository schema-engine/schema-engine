import type { FormAdapter } from '../types';
import { FormProvider } from './form-provider';
import { getActiveFormStore } from '../store/active-store';
import { useFormContext, useFormField, useWatchField, useWatchForm, useFieldArray } from './hooks';

export const radiantAdapter: FormAdapter = {
	useFormContext,
	useFormField,
	useWatchField,
	useWatchForm,
	useFieldArray,
	FormProvider,
};

export { FormProvider, getActiveFormStore };
export { useFormContext, useFormField, useWatchField, useWatchForm, useFieldArray };
