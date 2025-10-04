import type { FieldConfig, FormActionConfig, FormConfig } from '@json-form-engine/core/schemas';
import type { ReactNode } from 'react';

export interface FormContextValue<TFormData = Record<string, unknown>> {
	getValues: () => TFormData;
	setValue: (name: string, value: unknown) => void;
	trigger: (name?: string | string[]) => Promise<boolean>;
	setFocus: (name: string) => void;
	formState: {
		errors: Record<string, { message?: string }>;
		isValid: boolean;
		isSubmitting: boolean;
		touchedFields: Record<string, boolean>;
		submitCount: number;
		defaultValues?: Partial<TFormData>;
	};
}

export interface FormFieldValue<TFieldValue = unknown> {
	value: TFieldValue;
	error?: string;
	onChange: (value: TFieldValue) => void;
	onBlur: () => void;
	name: string;
	required: boolean;
}

export interface FormProviderProps<TFormData = Record<string, unknown>> {
	config: FormConfig;
	defaultValues?: Partial<TFormData>;
	children: ReactNode;
	onSubmit?: (data: TFormData) => void | Promise<void>;
	onChange?: (data: Partial<TFormData>) => void;
	onAction?: (action: FormActionConfig, data: TFormData) => void | Promise<void>;
	onValidationError?: (errors: Record<string, string>) => void;
}

export interface FormAdapter<TFormData = Record<string, unknown>> {
	useFormContext: () => FormContextValue<TFormData>;
	useFormField: <TFieldValue = unknown>(config: FieldConfig) => FormFieldValue<TFieldValue>;
	useWatchField: <TWatchValue = unknown>(name: string | string[]) => TWatchValue;
	FormProvider: React.ComponentType<FormProviderProps<TFormData>>;
	validateField: (name: string) => Promise<boolean>;
	validateFields: (names: string[]) => Promise<boolean>;
}
