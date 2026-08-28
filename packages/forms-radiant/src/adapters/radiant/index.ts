import type { FormAdapter, FormFieldValue } from '../types';
import { FormProvider } from './form-provider';
import { getActiveFormStore } from '../store/active-store';
import { bindControlledFormElement } from '@/hooks/bind-field';

function useFormContext() {
	return getActiveFormStore().getContext();
}

function useFormField<TFieldValue = unknown>(config: FormEngine.ElementConfig): FormFieldValue<TFieldValue> {
	return bindControlledFormElement<TFieldValue>(config) as FormFieldValue<TFieldValue>;
}

function useWatchField<TWatchValue = unknown>(name: string | string[]) {
	const store = getActiveFormStore();
	if (Array.isArray(name)) {
		return name.map((fieldName) => store.getValue(fieldName)) as TWatchValue;
	}
	return store.getValue(name) as TWatchValue;
}

function useWatchForm<TFormData = Record<string, unknown>>() {
	return getActiveFormStore().getValues() as TFormData;
}

function useFieldArray(fieldName: string) {
	const store = getActiveFormStore();
	const current = store.getValue<unknown[]>(fieldName) ?? [];

	return {
		fields: current.map((_, index) => ({ id: `${fieldName}-${index}` })),
		append: (value: unknown) => {
			store.setValue(fieldName, [...current, value]);
		},
		remove: (index: number) => {
			store.setValue(
				fieldName,
				current.filter((_, itemIndex) => itemIndex !== index),
			);
		},
	};
}

export const radiantAdapter: FormAdapter = {
	useFormContext,
	useFormField,
	useWatchField,
	useWatchForm,
	useFieldArray,
	FormProvider,
};

export { FormProvider, getActiveFormStore };
