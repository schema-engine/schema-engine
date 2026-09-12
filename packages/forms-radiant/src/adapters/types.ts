import type { FormActionConfig, FormConfig } from '@schema-engine/forms/schemas';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import type { JsxRenderable } from '@ecopages/jsx';

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
	disabled?: boolean;
}

export interface FieldArrayValue {
	fields: Array<{ id: string }>;
	append: (value: unknown) => void;
	remove: (index: number) => void;
}

export interface FormProviderProps<TFormData = Record<string, unknown>> {
	config: FormConfig | NormalizedFormConfig;
	defaultValues?: Partial<TFormData>;
	children?: JsxRenderable;
	onSubmit?: (data: TFormData) => void | Promise<void>;
	onChange?: (data: Partial<TFormData>) => void;
	onAction?: (action: FormActionConfig, data: TFormData) => void | Promise<void>;
}

export interface FormAdapter<TFormData = Record<string, unknown>> {
	useFormContext: () => FormContextValue<TFormData>;
	useFormField: <TFieldValue = unknown>(config: FormEngine.ElementConfig) => FormFieldValue<TFieldValue>;
	useWatchField: <TWatchValue = unknown>(name: string | string[]) => TWatchValue;
	useWatchForm: () => TFormData;
	useFieldArray: (name: string) => FieldArrayValue;
	FormProvider: (props: FormProviderProps<TFormData>) => JsxRenderable;
}
