import type { FormActionConfig, FormConfig } from '@schema-engine/forms/schemas';
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

export interface FormFieldArrayValue {
	fields: Array<{ id: string }>;
	append: (value: unknown) => void;
	remove: (index: number) => void;
}

/**
 * Props for the FormProvider component
 */
export interface FormProviderProps<TFormData = Record<string, unknown>> {
	/** Form configuration object defining structure, rules, and actions */
	config: FormConfig;
	/** Optional default values for form fields */
	defaultValues?: Partial<TFormData>;
	/** React children to render inside the form context */
	children: ReactNode;
	/** Callback function executed on successful form submission */
	onSubmit?: (data: TFormData) => void | Promise<void>;
	/** Callback function executed whenever form data changes */
	onChange?: (data: Partial<TFormData>) => void;
	/** Callback function executed when a form action is triggered */
	onAction?: (action: FormActionConfig, data: TFormData) => void | Promise<void>;
}

/**
 * Interface for form adapter implementation.
 *
 * Adapters are the stable integration boundary for form libraries.
 * Field-level validation should be driven through the adapter's form context
 * (`trigger`, `setValue`, `setFocus`) rather than adapter-specific helper
 * methods so different implementations can stay aligned.
 */
export interface FormAdapter<TFormData = Record<string, unknown>> {
	/** Hook to access form context (values, errors, state) */
	useFormContext: () => FormContextValue<TFormData>;
	/** Hook to register and manage a specific form field */
	useFormField: <TFieldValue = unknown>(config: FormEngine.ElementConfig) => FormFieldValue<TFieldValue>;
	/** Hook to watch a specific field value */
	useWatchField: <TWatchValue = unknown>(name: string | string[]) => TWatchValue;
	/** Hook to manage dynamic field arrays */
	useFieldArray: (name: string) => FormFieldArrayValue;
	/** The FormProvider component to wrap the form */
	FormProvider: React.ComponentType<FormProviderProps<TFormData>>;
}
